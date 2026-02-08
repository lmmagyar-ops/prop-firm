
"use client";

import { User, Upload } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProfilePictureUploadProps {
    currentImageUrl?: string | null;
    onUpload: (file: File) => void;
}

export function ProfilePictureUpload({ currentImageUrl, onUpload }: ProfilePictureUploadProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-4 text-center">
            <div
                className={cn(
                    "relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 cursor-pointer transition-all group",
                    isDragging ? "border-primary scale-105" : "border-zinc-800 hover:border-zinc-700"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {currentImageUrl ? (
                    <img src={currentImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <User className="w-12 h-12 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Upload className="w-8 h-8 text-white" />
                </div>

                {/* Hidden Input */}
                <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/png, image/jpeg"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            onUpload(e.target.files[0]);
                        }
                    }}
                />
            </div>

            <div>
                <p className="text-sm font-medium text-white">Profile Photo</p>
                <p className="text-xs text-zinc-500 mt-1">
                    Drag & drop or click to upload
                </p>
            </div>
        </div>
    );
}
