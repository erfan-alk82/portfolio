import { beforeEach, describe, expect, test, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  }),
}));
vi.mock("@/server/auth/dal", () => ({ checkAdminForAction: vi.fn() }));
vi.mock("@/server/blog/repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/blog/repository")>()),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  getPostById: vi.fn(),
  setTranslationStatus: vi.fn(),
  deletePost: vi.fn(),
}));

const { updateTag } = await import("next/cache");
const { checkAdminForAction } = await import("@/server/auth/dal");
const repository = await import("@/server/blog/repository");
const { deletePost, publishTranslation, savePost, unpublishTranslation } = await import(
  "@/app/admin/(dashboard)/posts/actions"
);

const ID = "0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c";
const idle = { status: "idle" } as const;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validPost = {
  slug: "new-slug",
  "en.title": "A title that is long enough to pass",
  "en.description": "A description",
  "en.body": "Body",
};

function record(overrides: Partial<{ slug: string; status: "draft" | "published"; description: string }> = {}) {
  return {
    id: ID,
    slug: overrides.slug ?? "notes",
    createdAt: new Date(),
    updatedAt: new Date(),
    translations: [
      {
        id: "t1",
        locale: "en" as const,
        title: "A title",
        description: overrides.description ?? "A description",
        bodyMd: "Body",
        status: overrides.status ?? ("draft" as const),
        publishedAt: null,
        updatedAt: new Date(),
      },
    ],
  };
}

function tags(): string[] {
  return vi.mocked(updateTag).mock.calls.map(([tag]) => tag);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkAdminForAction).mockResolvedValue("signed-in");
});

describe("session checks", () => {
  test("a signed-out request changes nothing and says so", async () => {
    vi.mocked(checkAdminForAction).mockResolvedValue("signed-out");
    const state = await savePost(idle, form(validPost));
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/session has ended/) });
    expect(repository.createPost).not.toHaveBeenCalled();
  });

  test("an outage is reported as unavailable, not as an ended session", async () => {
    vi.mocked(checkAdminForAction).mockResolvedValue("unavailable");
    for (const action of [savePost, publishTranslation, unpublishTranslation, deletePost]) {
      const state = await action(idle, form({ id: ID, ...validPost }));
      expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/could not be reached/) });
    }
  });
});

describe("savePost", () => {
  test("validation errors come back per field", async () => {
    const state = await savePost(idle, form({ slug: "Bad Slug" }));
    expect(state.status).toBe("error");
    expect(state.status === "error" && state.fieldErrors).toMatchObject({ slug: expect.any(String), translations: expect.any(String) });
    expect(tags()).toEqual([]);
  });

  test("creating expires the list and the new post, then opens the editor", async () => {
    vi.mocked(repository.createPost).mockResolvedValue({ ...record({ slug: "new-slug" }) });
    await expect(savePost(idle, form(validPost))).rejects.toThrow(`redirect:/admin/posts/${ID}?created=1`);
    expect(tags()).toEqual(["posts", "post:new-slug"]);
  });

  test("renaming expires the old slug too", async () => {
    vi.mocked(repository.updatePost).mockResolvedValue({ post: record({ slug: "new-slug" }), previousSlug: "old-slug" });
    const state = await savePost(idle, form({ id: ID, ...validPost }));
    expect(state).toEqual({ status: "success", message: "Saved." });
    expect(tags()).toEqual(["posts", "post:new-slug", "post:old-slug"]);
  });

  test("a taken slug is reported on the slug field", async () => {
    vi.mocked(repository.updatePost).mockRejectedValue(new repository.SlugTakenError("new-slug"));
    const state = await savePost(idle, form({ id: ID, ...validPost }));
    expect(state.status === "error" && state.fieldErrors?.slug).toMatch(/already uses/);
    expect(tags()).toEqual([]);
  });
});

describe("publishing", () => {
  test("blocking SEO errors stop publishing on the server", async () => {
    vi.mocked(repository.getPostById).mockResolvedValue(record({ description: "" }));
    const state = await publishTranslation(idle, form({ id: ID, publishLocale: "en" }));
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/Cannot publish the English version/) });
    expect(repository.setTranslationStatus).not.toHaveBeenCalled();
  });

  test("publishing and unpublishing expire the list and the post", async () => {
    vi.mocked(repository.getPostById).mockResolvedValue(record());
    vi.mocked(repository.setTranslationStatus).mockResolvedValue({ slug: "notes" });
    expect(await publishTranslation(idle, form({ id: ID, publishLocale: "en" }))).toMatchObject({ status: "success" });
    expect(repository.setTranslationStatus).toHaveBeenCalledWith(ID, "en", "published");
    expect(await unpublishTranslation(idle, form({ id: ID, publishLocale: "en" }))).toMatchObject({ status: "success" });
    expect(repository.setTranslationStatus).toHaveBeenLastCalledWith(ID, "en", "draft");
    expect(tags()).toEqual(["posts", "post:notes", "posts", "post:notes"]);
  });
});

describe("deletePost", () => {
  test("needs the slug typed back", async () => {
    vi.mocked(repository.getPostById).mockResolvedValue(record());
    const state = await deletePost(idle, form({ id: ID, confirmSlug: "nope" }));
    expect(state.status === "error" && state.fieldErrors?.confirmSlug).toBeTruthy();
    expect(repository.deletePost).not.toHaveBeenCalled();
  });

  test("deletes, expires the post's caches and returns to the list", async () => {
    vi.mocked(repository.getPostById).mockResolvedValue(record());
    vi.mocked(repository.deletePost).mockResolvedValue({ slug: "notes" });
    await expect(deletePost(idle, form({ id: ID, confirmSlug: "notes" }))).rejects.toThrow("redirect:/admin?deleted=1");
    expect(tags()).toEqual(["posts", "post:notes"]);
  });
});
