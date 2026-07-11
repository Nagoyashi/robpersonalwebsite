/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Allowlisted operator's GitHub login, set by the /admin gate middleware
     *  (null on open/public routes). Used as the audit-log actor. */
    operator: string | null;
  }
}
