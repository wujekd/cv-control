import { CLASSIC_V1_TEMPLATE, type DocumentTemplate } from "@cv-control/shared";

export class DocumentTemplateRepository {
  list(): DocumentTemplate[] {
    return [CLASSIC_V1_TEMPLATE];
  }

  get(templateId: string): DocumentTemplate | null {
    return this.list().find((template) => template.id === templateId) ?? null;
  }
}

