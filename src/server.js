import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const factsDir = path.join(__dirname, "../collections/facts");

const ensureFactsDir = () => {
  if (!fs.existsSync(factsDir)) {
    fs.mkdirSync(factsDir, { recursive: true });
  }
};

const parseVersionName = (fileName) => {
  const match = fileName.match(/^facts-(\d{2})-(\d{2})-(\d{4})\.txt$/);
  if (!match) return null;

  const [, month, day, year] = match;
  const sortable = `${year}-${month}-${day}`;

  return {
    fileName,
    version: `${month}${day}${year}`,
    sortable,
  };
};

app.get("/v1/fact/downloadList", (req, res) => {
  ensureFactsDir();

  const { name } = req.query;

  if (!name) {
    return res.status(400).json({
      error: "Missing name query parameter",
    });
  }

  if (!/^\d{8}$/.test(name)) {
    return res.status(400).json({
      error: "Invalid name format. Use MMDDYYYY",
    });
  }

  const month = name.slice(0, 2);
  const day = name.slice(2, 4);
  const year = name.slice(4, 8);

  const fileName = `facts-${month}-${day}-${year}.txt`;
  const filePath = path.join(factsDir, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Not found",
    });
  }

  return res.download(filePath, fileName);
});

app.get("/v1/fact/versionsList", (req, res) => {
  ensureFactsDir();

  const files = fs.readdirSync(factsDir);
  const versions = files
    .map(parseVersionName)
    .filter(Boolean)
    .sort((a, b) => b.sortable.localeCompare(a.sortable));

  if (versions.length === 0) {
    return res.json({
      latest: "",
      allVersions: [],
      message: "No facts found",
    });
  }

  return res.json({
    latest: versions[0].version,
    allVersions: versions.map((item) => item.version),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});