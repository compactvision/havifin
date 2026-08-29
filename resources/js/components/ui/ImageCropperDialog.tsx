import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getCroppedImageBlob, type CropArea } from '@/lib/cropImage';
import { ZoomIn } from 'lucide-react';
import { useCallback, useState } from 'react';
import Cropper, { type Point } from 'react-easy-crop';

interface ImageCropperDialogProps {
    open: boolean;
    imageSrc: string | null;
    onCancel: () => void;
    onCropped: (file: File) => void;
    /** Original filename, reused for the cropped output. */
    fileName?: string;
}

/**
 * Square (1:1) cropper matching the round-square icon slot every logo
 * renders into (InstitutionManager / InstitutionSelector cards).
 */
export function ImageCropperDialog({
    open,
    imageSrc,
    onCancel,
    onCropped,
    fileName = 'logo.png',
}: ImageCropperDialogProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] =
        useState<CropArea | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropComplete = useCallback((_area: CropArea, areaPixels: CropArea) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleClose = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onCancel();
    };

    const handleValidate = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
            const outputName = fileName.replace(/\.[^.]+$/, '') + '.png';
            const file = new File([blob], outputName, { type: 'image/png' });
            onCropped(file);
        } finally {
            setIsProcessing(false);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajuster le logo</DialogTitle>
                </DialogHeader>

                <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-slate-900">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="rect"
                            showGrid
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3 px-1">
                    <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                        aria-label="Zoom"
                    />
                </div>
                <p className="px-1 text-xs text-slate-500">
                    Le logo sera recadré au format carré utilisé partout dans
                    l'application.
                </p>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isProcessing}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        onClick={handleValidate}
                        disabled={isProcessing || !croppedAreaPixels}
                    >
                        {isProcessing ? 'Traitement…' : 'Valider le cadrage'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
