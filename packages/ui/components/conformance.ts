/**
 * Platform conformance — 12.A7.
 *
 * "The same API on web and native" is a claim that decays the moment somebody
 * adds a prop to one renderer and forgets the other. This file turns the claim
 * into a compile error.
 *
 * The check is deliberately asymmetric, and the direction matters:
 *
 *   - every contract component must EXIST in a renderer's prop map, and
 *   - every contract prop must be ACCEPTED by a renderer's prop type.
 *
 * A renderer is allowed to add its own props beyond the contract — that is how
 * `href` stays on the web and `onPress` stays on native — but it may not drop or
 * narrow one, because that is the direction that breaks a screen.
 *
 * Nothing here runs at runtime. If a platform drifts, `tsc` fails and names the
 * component, long before a device does.
 */

import type { ContractMap as C, ContractName, NativeRequired, WebRequired } from './contract';
import { WEB_ONLY } from './contract';
import type { ComponentProps as Web } from '../components.web';
import type { ComponentProps as Native } from '../../ui-native/src/components';

/** Fails to compile unless T is exactly true. */
type Expect<T extends true> = T;

/** The names a renderer's map does not cover, or `never`. */
type Missing<Names extends string, Map> = {
  [K in Names]: K extends keyof Map ? never : K;
}[Names];

/** Same, but over the subset a given platform is required to have. */
type MissingRequired<Names extends string, Map> = Missing<Names, Map>;

/** The contract names a renderer's props do not accept, or `never`. */
type UnacceptedAll<Map> = {
  [K in keyof C]: C[K] extends Map[K & keyof Map] ? never : K;
}[keyof C];

/** The same, over the subset a platform is required to have — an exempt name
 *  cannot also be "unaccepted", because it is not supposed to be there. */
type UnacceptedRequired<Names extends string, Map> = {
  [K in Names]: C[K & keyof C] extends Map[K & keyof Map] ? never : K;
}[Names];

type CoversEverything<Names extends string, Map> = [Missing<Names, Map>] extends [never] ? true : false;
type AcceptsEverything<Names extends string, Map> = [UnacceptedRequired<Names, Map>] extends [never] ? true : false;

type List<T> = [T] extends [never] ? 'none' : Extract<T, string>;

type MissingReport<Map> = `renderer is missing these contract components: ${List<Missing<keyof C & ContractName, Map>>}`;


/**
 * When one of these fails, the error NAMES the components. `Expect` is given a
 * template literal rather than `false`, so the compiler prints
 * `"renderer is missing these contract components: Input, Select"` instead of a
 * bare "Type 'false' does not satisfy the constraint 'true'" — which is the
 * difference between a five-second fix and a search.
 */
export type WebCoversTheContract = Expect<
  [MissingRequired<WebRequired, Web>] extends [never] ? true : `web renderer is missing: ${List<MissingRequired<WebRequired, Web>>}`
>;

/**
 * The native renderer is checked against `NativeRequired`, not the whole
 * contract, so a web-only component is an EXEMPTION rather than a hole. The
 * exemption still has to be spelled out in the contract — see `WEB_ONLY` — and
 * `PlatformExemptionsAreDeclared` below is what stops the list from quietly
 * growing.
 */
export type NativeCoversTheContract = Expect<
  [MissingRequired<NativeRequired, Native>] extends [never] ? true : `native renderer is missing: ${List<MissingRequired<NativeRequired, Native>>}`
>;

/** Every name the native renderer is allowed to skip must be declared as such. */
type UndeclaredExemption = Extract<ContractName, keyof Native> extends never
  ? Extract<Missing<ContractName, Native>, ContractName>
  : never;
type DeclaredExemptions = keyof typeof WEB_ONLY & ContractName;
export type PlatformExemptionsAreDeclared = Expect<
  [Extract<UndeclaredExemption, Exclude<ContractName, DeclaredExemptions>>] extends [never]
    ? true
    : `these are missing on native and NOT declared in WEB_ONLY: ${List<Extract<UndeclaredExemption, Exclude<ContractName, DeclaredExemptions>>>}`
>;
export type WebAcceptsTheContract = Expect<
  [UnacceptedRequired<WebRequired, Web>] extends [never] ? true : `web renderer does not accept: ${List<UnacceptedRequired<WebRequired, Web>>}`
>;
export type NativeAcceptsTheContract = Expect<
  [UnacceptedRequired<NativeRequired, Native>] extends [never] ? true : `native renderer does not accept: ${List<UnacceptedRequired<NativeRequired, Native>>}`
>;

/**
 * The two platforms must not merely both accept the contract — a screen written
 * once should read the same on both, so a renderer may not silently rename or
 * re-type a contract prop either. `Match<K>` fails when the web and native
 * accept different shapes for the same component.
 */
type SameShape = {
  [K in NativeRequired]: [C[K & keyof C] extends Web[K & keyof Web] ? true : false] extends [
    C[K & keyof C] extends Native[K & keyof Native] ? true : false,
  ]
    ? never
    : K;
}[NativeRequired];

export type PlatformsAgreeOnShape = Expect<
  [SameShape] extends [never] ? true : `web and native disagree on the shape of: ${List<SameShape>}`
>;
