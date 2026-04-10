import { test, expect } from '@playwright/test';
import { DateTime } from 'luxon';

test('smoke: basic navigation and login', async ({ page }) => {
  await page.goto('/'); // Uses baseURL from config
  await expect(page).toHaveTitle(/^RandoPlan/);

  // Basic core feature check
  const heading = page.getByRole('heading', {
    name: /when does your ride start/i
  })
  await expect(heading).toBeVisible();
  const tomorrowSevenAM = DateTime.local()
    .plus({ days: 1 })
    .set({ hour: 7, minute: 0, second: 0, millisecond: 0 });
  const expectedButtonLabel = 'Click here to pick the ride start'; //`/ ${tomorrowSevenAM.toFormat('MMMM d, yyyy h:mma')}/i`;
  const dateButton = page.getByRole('button', {
    name: expectedButtonLabel
  });
  await expect(dateButton).toBeVisible();
});

test('smoke: load route button appears when not in new user mode', async ({ page, context }) => {
  await context.addCookies([{
    name: 'pace',
    value: 'D',
    domain: 'localhost', // Replace with your domain
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  }]);
  await page.goto('/');
  const loadRouteButton = page.getByRole('button', { name: 'Load Route' });
  await expect(loadRouteButton).toBeVisible();
});
