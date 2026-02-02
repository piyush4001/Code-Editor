import { useState, useEffect, useRef, useCallback } from "react";

import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const instanceRef = useRef<WebContainer | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        // Check if instance already exists to avoid "Only a single WebContainer instance can be booted" error
        if (instanceRef.current) {
          setInstance(instanceRef.current);
          setIsLoading(false);
          return;
        }

        const webcontainerInstance = await WebContainer.boot();

        if (!mounted) {
          // If component unmounted during boot, teardown immediately
          webcontainerInstance.teardown();
          return;
        }

        instanceRef.current = webcontainerInstance;
        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (error) {
        console.log("failed in initilizing webcontainer", error);

        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initilize Webcontiner"
          );
          setIsLoading(false);
        }
      }
    }
    initializeWebContainer();
    return () => {
      mounted = false;
    };
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!instance) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        const pathParts = path.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");

        if (folderPath) {
          await instance.fs.mkdir(folderPath, { recursive: true });
        }

        await instance.fs.writeFile(path, content);
      } catch (error) {
        const errorMeassage =
          error instanceof Error ? error.message : "Failed to write file";
        console.error(`Failed to write file at ${path}:`, error);
        throw new Error(`Failed to write file at ${path}: ${errorMeassage}`);
      }
    },
    [instance]
  );

  const destroy = useCallback(() => {
    if (instance) {
      instance.teardown();
      instanceRef.current = null;
      setInstance(null);
      setServerUrl(null);
    }
  }, [instance]);

  return { serverUrl, isLoading, error, instance, writeFileSync, destroy };
};
