import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface StimulusModalProps {
  stimulus: {
    type: "image" | "video";
    url: string;
    altText?: string | null;
    title?: string | null;
  };
  trigger: React.ReactNode;
}

export const StimulusModal: React.FC<StimulusModalProps> = ({
  stimulus,
  trigger,
}) => {
  const renderContent = () => {
    if (stimulus.type === "image") {
      return (
        <img
          src={stimulus.url}
          alt={stimulus.altText ?? "Image"}
          className="w-auto object-contain"
        />
      );
    } else if (stimulus.type === "video") {
      return (
        <video src={stimulus.url} controls className="max-h-[80vh] w-auto" />
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:h-fit md:w-fit">
        <div className="flex flex-col items-center justify-center">
          {renderContent()}
          {stimulus.title && (
            <div className="mt-2 text-center text-lg text-white">
              {stimulus.title}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
