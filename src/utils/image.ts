/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio,
 * then returns a base64 string without the prefix (suitable for our API/state).
 */
export function resizeImageAndToBase64(file: File, maxDimension: number = 1000, quality: number = 0.85): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Draw to canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2D context from canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL with controlled quality
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = () => {
        reject(new Error("Failed to load image into Image object"));
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      } else {
        reject(new Error("Failed to read image data"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
