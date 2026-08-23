"use client";
import { useEffect } from "react";
import { track } from "../lib/telemetry";
export function LandingTelemetry() { useEffect(() => track("landing_view"), []); return null; }
