// Known gap: `static accessor` (TS 4.9 auto-accessors).
export class Config { static accessor shared = 1; accessor local = 2; }
