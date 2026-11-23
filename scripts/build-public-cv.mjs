/**
 * Builds the downloadable CV from cv/erfan.yaml (the RenderCV source) and writes it
 * to public/cv/Erfan-Alikhani-CV.pdf. The owner chose to publish the phone number,
 * so the CV is rendered as written.
 *
 * Requires RenderCV: `pip install "rendercv[full]"`. Run: npm run cv:public
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const source = resolve(process.cwd(), "cv", "erfan.yaml");
const target = resolve(process.cwd(), "public", "cv", "Erfan-Alikhani-CV.pdf");

function findPython() {
  for (const candidate of ["py", "python3", "python"]) {
    const probe = spawnSync(candidate, ["-m", "rendercv", "--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  throw new Error('RenderCV not found. Install it with: pip install "rendercv[full]"');
}

function render(input, workDir) {
  const result = spawnSync(
    findPython(),
    ["-m", "rendercv", "render", input, "--dont-generate-html", "--dont-generate-markdown", "--dont-generate-png"],
    { cwd: workDir, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  );
  if (result.error) throw new Error(`Could not start RenderCV: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`RenderCV failed:\n${result.stderr || result.stdout}`);
}

async function main() {
  const workDir = await mkdtemp(join(tmpdir(), "public-cv-"));
  try {
    const input = join(workDir, "Erfan_Alikhani_CV.yaml");
    await writeFile(input, await readFile(source, "utf8"));
    render(input, workDir);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(workDir, "rendercv_output", "Erfan_Alikhani_CV.pdf"), target);
    process.stdout.write(`wrote ${target}\n`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
