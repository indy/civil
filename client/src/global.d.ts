/*
  Fucking bullshit web development crap.

  Fucking preact changed it's definition of HTMLAttributes in version 10.18.2 (10.18.1 was fine). Typescript's tsc could now no longer find the href attribute that the  Link element from preact-router relies on.

  This global.d.ts declaration effectively patches the old definition back in, but will probably cause some more problems in the future.

 */

declare namespace preact.JSX {
  interface HTMLAttributes {
      href?: string | undefined;
      type?: string | undefined;
  }
}
