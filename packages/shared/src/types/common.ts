export type ID = string;

export type DatePrecision = "year" | "month" | "day";

export interface PartialDate {
  year: number;
  month?: number;
  day?: number;
  precision: DatePrecision;
}

export interface LinkRef {
  id: ID;
  label: string;
  url: string;
}

export interface BulletPoint {
  id: ID;
  text: string;
  linkUrl?: string;
  tags?: string[];
  priority?: number;
}

export interface InsetsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
