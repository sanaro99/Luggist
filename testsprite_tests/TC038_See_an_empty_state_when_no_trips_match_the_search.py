import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(15000)
        page = await context.new_page()
        # -> navigate
        await page.goto("http://localhost:3100")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Reload the app using a cache-busting URL (navigate to http://localhost:3100/?_t=1) to attempt to get the SPA to render, then check for interactive elements.
        await page.goto("http://localhost:3100/?_t=1")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the app in a new browser tab (http://localhost:3100) to see if the SPA renders there, then inspect the new tab for interactive elements.
        await page.goto("http://localhost:3100")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Test blocked (AST guard fallback)
        raise AssertionError("Test blocked during agent run: " + "TEST BLOCKED The app could not be reached \u2014 the SPA did not render in the browser, so the dashboard UI (required to create trips and test the search) was unavailable. Observations: - The page DOM is empty and there are 0 interactive elements. - The screenshot is blank after multiple navigations and waits (including a cache-busted URL and opening a new tab).")
        await asyncio.sleep(5)
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    