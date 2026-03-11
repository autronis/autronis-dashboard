import path from "path";
import fs from "fs";
import { sqlite } from "./db";

const BACKUPS_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUPS = 30;

function getTodayFilename(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `autronis_backup_${yyyy}-${mm}-${dd}.db`;
}

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function cleanupOldBackups(): void {
  try {
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith("autronis_backup_") && f.endsWith(".db"))
      .sort(); // lexicographic sort works for YYYY-MM-DD filenames

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(0, files.length - MAX_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(BACKUPS_DIR, file));
        console.log(`[backup] Deleted old backup: ${file}`);
      }
    }
  } catch (err) {
    console.error("[backup] Error during cleanup:", err);
  }
}

export async function createBackup(): Promise<{ success: boolean; message: string }> {
  try {
    ensureBackupsDir();

    const filename = getTodayFilename();
    const backupPath = path.join(BACKUPS_DIR, filename);

    if (fs.existsSync(backupPath)) {
      return {
        success: true,
        message: `Backup already exists for today: ${filename}`,
      };
    }

    // better-sqlite3 backup() returns a promise
    await sqlite.backup(backupPath);

    console.log(`[backup] Created backup: ${filename}`);
    cleanupOldBackups();

    return {
      success: true,
      message: `Backup created: ${filename}`,
    };
  } catch (err) {
    console.error("[backup] Backup failed:", err);
    return {
      success: false,
      message: `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
