import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ERROR A PROPÓSITO para probar el CI — se revierte en el commit siguiente
export const pruebaCi: number = "esto no es un número";
