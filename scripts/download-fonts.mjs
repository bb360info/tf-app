/**
 * Font downloader script — downloads self-hosted fonts from Google Fonts.
 * Run: node scripts/download-fonts.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const FONTS_DIR = join(process.cwd(), "public", "fonts");

const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** @type {{ family: string, dir: string, weights: number[], files: Record<number, string> }[]} */
const FONTS = [
    {
        family: "Inter",
        dir: "inter",
        weights: [400, 500, 600, 700, 800],
        files: {
            400: "Inter-Regular",
            500: "Inter-Medium",
            600: "Inter-SemiBold",
            700: "Inter-Bold",
            800: "Inter-ExtraBold",
        },
    },
    {
        family: "Plus Jakarta Sans",
        dir: "plus-jakarta-sans",
        weights: [600, 700, 800],
        files: {
            600: "PlusJakartaSans-SemiBold",
            700: "PlusJakartaSans-Bold",
            800: "PlusJakartaSans-ExtraBold",
        },
    },
    {
        family: "JetBrains Mono",
        dir: "jetbrains-mono",
        weights: [400, 500, 700],
        files: {
            400: "JetBrainsMono-Regular",
            500: "JetBrainsMono-Medium",
            700: "JetBrainsMono-Bold",
        },
    },
    {
        family: "Noto Sans SC",
        dir: "noto-sans-sc",
        weights: [400, 500, 700],
        files: {
            400: "NotoSansSC-Regular",
            500: "NotoSansSC-Medium",
            700: "NotoSansSC-Bold",
        },
    },
];

async function downloadFont(family, weight, outputPath) {
    const encodedFamily = family.replace(/ /g, "+");
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weight}&display=swap`;

    const cssRes = await fetch(cssUrl, { headers: { "User-Agent": UA } });
    const css = await cssRes.text();

    // Extract the latin woff2 URL (last one in the CSS)
    const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/g)].map(
        (m) => m[1]
    );
    const latinUrl = urls.at(-1);
    if (!latinUrl) {
        console.error(`  ✗ No URL found for ${family} ${weight}`);
        return false;
    }

    const fontRes = await fetch(latinUrl);
    const buffer = Buffer.from(await fontRes.arrayBuffer());
    await writeFile(outputPath, buffer);
    console.log(`  ✓ ${outputPath.split("/").pop()} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
}

async function main() {
    console.log("🔤 Downloading self-hosted fonts...\n");

    for (const font of FONTS) {
        const dir = join(FONTS_DIR, font.dir);
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });

        console.log(`📦 ${font.family}`);
        for (const weight of font.weights) {
            const filename = `${font.files[weight]}.woff2`;
            const outputPath = join(dir, filename);

            if (existsSync(outputPath)) {
                console.log(`  ⏭ ${filename} (exists)`);
                continue;
            }

            await downloadFont(font.family, weight, outputPath);
        }
        console.log();
    }

    console.log("✅ All fonts downloaded to public/fonts/");
}

main().catch(console.error);
