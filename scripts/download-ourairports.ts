import "../lib/load-env";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { OURAIRPORTS_DATA_BASE, OURAIRPORTS_FILES } from "../lib/ourairports/csv";

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await import("fs/promises").then((fs) => fs.writeFile(dest, buf));
}

async function main() {
  const dir = join(process.cwd(), "data", "ourairports");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  console.log(`Downloading OurAirports CSVs to ${dir}…`);
  console.log(`Source: ${OURAIRPORTS_DATA_BASE}\n`);

  for (const file of OURAIRPORTS_FILES) {
    const url = `${OURAIRPORTS_DATA_BASE}/${file}`;
    const dest = join(dir, file);
    process.stdout.write(`  ${file}… `);
    await downloadFile(url, dest);
    const size = (await import("fs/promises").then((fs) => fs.stat(dest))).size;
    console.log(`${(size / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log("\nDone. Import with: npm run db:ourairports-import");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
