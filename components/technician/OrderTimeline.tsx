"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";

interface TimelineStep {
  status: "completed" | "current" | "pending";
  label: string;
  description?: string;
}

interface OrderTimelineProps {
  steps: TimelineStep[];
}

export default function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Step Icon */}
          <div className="flex flex-col items-center">
            {step.status === "completed" ? (
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            ) : step.status === "current" ? (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <Clock className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <Circle className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <span className="text-xs mt-1 text-center max-w-[60px] font-medium">
              {step.label}
            </span>
          </div>
          
          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div
              className={`h-0.5 w-12 mx-1 ${
                step.status === "completed" ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
