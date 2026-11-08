/**
 * The probes the step 9D pages are measured with.
 *
 * Figma draws the method options of "Payment method modal" (2:5861–2:5865):
 * three 73px blocks, 16px apart, with the 191×47 action and the 104×49 cancel.
 * The payment method page reuses those options, so the same boxes apply.
 *
 * A probe measures against the content box. A probe with a "gapFrom" measures
 * against another probe instead, which is how the 16px rhythm between the
 * method options and the inset of the receipt card are checked.
 *
 * The page wraps its text on mobile — Figma's own mobile modal wraps its title
 * and its note the same way — so the boxes below the card move down on the
 * narrow screens. The tables hold the Figma values per width.
 */

/** The method options, the action and the cancel of the payment method page. */
const payProbes = {
  1440: [
    {
      label: "option0",
      selector: '[data-payment="form"] [role="radio"]:nth-of-type(1)',
      top: 463,
      height: 73,
    },
    {
      label: "option1",
      selector: '[data-payment="form"] [role="radio"]:nth-of-type(2)',
      gapFrom: "option0",
      gap: 89,
    },
    {
      label: "option2",
      selector: '[data-payment="form"] [role="radio"]:nth-of-type(3)',
      gapFrom: "option1",
      gap: 89,
    },
    {
      label: "pay",
      selector: '[data-payment="pay"]',
      top: 963,
      height: 47,
      width: 191,
    },
    {
      label: "cancel",
      selector: '[data-payment="cancel"]',
      top: 1026,
      height: 49,
      width: 104,
    },
  ],
  375: [
    {
      label: "option0",
      selector: '[data-payment="form"] [role="radio"]:nth-of-type(1)',
      top: 548,
      height: 73,
    },
    {
      label: "option1",
      selector: '[data-payment="form"] [role="radio"]:nth-of-type(2)',
      gapFrom: "option0",
      gap: 89,
    },
    {
      label: "option2",
      selector: '[data-payment="form"] [role="radio"]:nth-of-type(3)',
      gapFrom: "option1",
      gap: 89,
    },
    {
      label: "pay",
      selector: '[data-payment="pay"]',
      top: 1067,
      height: 47,
      width: 191,
    },
    {
      label: "cancel",
      selector: '[data-payment="cancel"]',
      top: 1130,
      height: 49,
      width: 104,
    },
  ],
};

/**
 * The probes of the payment method page.
 *
 * The tablet frame draws the page in the same box as the desktop one, so it
 * shares the desktop probes.
 */
export function payPageProbes(width) {
  return payProbes[width] ?? payProbes[1440];
}

/**
 * The probes of the receipt page.
 *
 * Figma "Payment receipt" (2:6163 desktop, 2:6233 tablet, 2:6314 mobile) draws
 * the card with a 25px inset: the heading 25px down, the amount 76px down, the
 * details 150px down and the action 304px down. The parts are measured from
 * the card itself, so the same insets hold on every width.
 */
const receiptProbes = {
  1440: { cardTop: 1074 },
  768: { cardTop: 1139 },
  375: { cardTop: 1296 },
};

export function receiptPageProbes(width) {
  const { cardTop } = receiptProbes[width] ?? receiptProbes[1440];

  return [
    {
      label: "card",
      selector: '[data-receipt="card"]',
      top: cardTop,
      height: 376,
    },
    {
      label: "cardHeading",
      selector: '[data-receipt="card"] h3',
      gapFrom: "card",
      gap: 25,
      height: 35,
    },
    {
      label: "cardAmount",
      selector: '[data-receipt="card"] p.text-display',
      gapFrom: "card",
      gap: 76,
      height: 58,
    },
    {
      label: "cardDetails",
      selector: '[data-receipt="card"] .h-\\[138px\\]',
      gapFrom: "card",
      gap: 150,
      height: 138,
    },
    {
      label: "cardAction",
      selector: '[data-receipt="card"] button',
      gapFrom: "card",
      gap: 304,
      height: 47,
      width: 184,
    },
  ];
}
