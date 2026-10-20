import { useCallback, useEffect, useRef, useState } from "react";
import { loadWorkspace, type Workspace } from "./storage";

export default function useWorkspace() {
  const [workspace, setWorkspaceState] = useState(loadWorkspace);
  const latest = useRef(workspace);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState("");
  const persist = useCallback(() => {
    if (!dirty.current) return;
    try {
      localStorage.setItem(
        "codemon.workspace.v1",
        JSON.stringify(latest.current),
      );
      dirty.current = false;
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is full or unavailable. Export a backup to keep your work.",
      );
    }
    setSaving(false);
  }, []);
  const updateWorkspace = useCallback(
    (update: (current: Workspace) => Workspace) => {
      // Update this ref synchronously: pagehide can arrive before React commits.
      latest.current = update(latest.current);
      dirty.current = true;
      setWorkspaceState(latest.current);
      setSaving(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(persist, 350);
    },
    [persist],
  );
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      clearTimeout(timer.current);
      persist();
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [persist]);
  return { workspace, setWorkspace: updateWorkspace, saving, storageError };
}
