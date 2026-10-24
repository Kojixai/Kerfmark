'use client';

import {
  AirplaneTilt, ArrowCounterClockwise, ArrowLeft, ArrowRight, ArrowsClockwise, Bank, Bell, Boat, BookOpen, Buildings,
  Calculator, CalendarBlank, CaretDown, CaretRight, ChartLine, Check, CheckCircle, Clock, Copy, Cube, CurrencyGbp,
  DownloadSimple, EnvelopeSimple, Eye, FileText, Files, FireExtinguisher, Flask, Gear, GraduationCap, Hammer,
  Heartbeat, House, IdentificationCard, Info, Kanban, Lightning, Link, List, ListChecks, LockKey, MagicWand,
  MagnifyingGlass, MapPin, Minus, Package, PaperPlaneTilt, Phone, Plus, Printer, Receipt, Ruler, Scissors,
  ShieldCheck, Signature, Sliders, Sparkle, SquaresFour, Stack, Storefront, Timer, Trash, Truck, UploadSimple,
  Users, UserSwitch, Warning, X,
  type Icon as PhIcon,
} from '@phosphor-icons/react';

const MAP: Record<string, PhIcon> = {
  'airplane-tilt': AirplaneTilt, 'arrow-counter-clockwise': ArrowCounterClockwise, 'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight, 'arrows-clockwise': ArrowsClockwise, bank: Bank, bell: Bell, boat: Boat,
  'book-open': BookOpen, buildings: Buildings, calculator: Calculator, 'calendar-blank': CalendarBlank,
  'caret-down': CaretDown, 'caret-right': CaretRight, 'chart-line': ChartLine, check: Check,
  'check-circle': CheckCircle, clock: Clock, copy: Copy, cube: Cube, 'currency-gbp': CurrencyGbp,
  'download-simple': DownloadSimple, 'envelope-simple': EnvelopeSimple, eye: Eye, 'file-text': FileText,
  files: Files, 'fire-extinguisher': FireExtinguisher, flask: Flask, gear: Gear, 'graduation-cap': GraduationCap,
  hammer: Hammer, heartbeat: Heartbeat, house: House, 'identification-card': IdentificationCard, info: Info,
  kanban: Kanban, lightning: Lightning, link: Link, list: List, 'list-checks': ListChecks, 'lock-key': LockKey,
  'magic-wand': MagicWand, 'magnifying-glass': MagnifyingGlass, 'map-pin': MapPin, minus: Minus, package: Package,
  'paper-plane-tilt': PaperPlaneTilt, phone: Phone, plus: Plus, printer: Printer, receipt: Receipt, ruler: Ruler,
  scissors: Scissors, 'shield-check': ShieldCheck, signature: Signature, sliders: Sliders, sparkle: Sparkle,
  'squares-four': SquaresFour, stack: Stack, storefront: Storefront, timer: Timer, trash: Trash, truck: Truck,
  'upload-simple': UploadSimple, users: Users, 'user-switch': UserSwitch, warning: Warning, x: X,
};

export function Icon({ name, s, className = '' }: { name: string; s?: boolean; className?: string }) {
  const C = MAP[name] ?? Info;
  return <C className={`ic ${s ? 's' : ''} ${className}`} weight="regular" aria-hidden />;
}

export const SECTOR_ICON: Record<string, string> = { Residential: 'house', Marine: 'boat', Aviation: 'airplane-tilt' };
