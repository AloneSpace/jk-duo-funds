import { defineStore } from "pinia";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useFirebase } from "~/composables/firebase/useFirebase";
import type { SlipAnalysisResult } from "~/types/duo-funds";

export const useSlipUploadStore = defineStore("slip-upload", () => {
  const isAnalyzing = ref(false);
  const isUploading = ref(false);
  const analysisResult = ref<SlipAnalysisResult | null>(null);
  const analysisError = ref<string | null>(null);

  const reset = () => {
    isAnalyzing.value = false;
    isUploading.value = false;
    analysisResult.value = null;
    analysisError.value = null;
  };

  const analyzeSlip = async (
    file: File,
  ): Promise<SlipAnalysisResult | null> => {
    isAnalyzing.value = true;
    analysisError.value = null;
    analysisResult.value = null;

    try {
      const base64 = await fileToBase64(file);

      const response = await $fetch<SlipAnalysisResult>("/api/analyze-slip", {
        method: "POST",
        body: {
          imageBase64: base64,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      });

      analysisResult.value = response;
      return response;
    } catch (err) {
      analysisError.value =
        err instanceof Error ? err.message : "Slip analysis failed.";
      return null;
    } finally {
      isAnalyzing.value = false;
    }
  };

  const uploadToStorage = async (
    file: File,
    pairId: string,
    uploaderId: string,
  ): Promise<string> => {
    isUploading.value = true;

    try {
      await getAuth(useFirebase()).authStateReady();
      const storage = getStorage(useFirebase());
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `pairs/${pairId}/slips/${uploaderId}-${Date.now()}.${ext}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      return await getDownloadURL(fileRef);
    } finally {
      isUploading.value = false;
    }
  };

  return {
    isAnalyzing,
    isUploading,
    analysisResult,
    analysisError,
    analyzeSlip,
    uploadToStorage,
    reset,
  };
});

// Helper: File → base64 string (without data: prefix)
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
