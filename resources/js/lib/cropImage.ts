export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.crossOrigin = 'anonymous';
        image.src = url;
    });
}

/**
 * Crops the given image to `cropArea` and resizes the result to a square
 * `outputSize`, matching the 1:1 icon slot used everywhere logos render.
 */
export async function getCroppedImageBlob(
    imageSrc: string,
    cropArea: CropArea,
    outputSize = 512,
    mimeType = 'image/png',
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
    }

    ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        outputSize,
        outputSize,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob failed'));
                }
            },
            mimeType,
            0.92,
        );
    });
}
