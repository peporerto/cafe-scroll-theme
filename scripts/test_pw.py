import os
import sys

try:
    from playwright.sync_api import sync_playwright
    print("Imported sync_playwright successfully")
    with sync_playwright() as p:
        print("Playwright context entered")
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True,
            args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
        )
        print("Browser launched:", browser)
        page = browser.new_page()
        page.set_content("<h1>Hello</h1>")
        print("Page title:", page.title())
        browser.close()
        print("Done successfully!")
except Exception as e:
    print("Error:", type(e), e)
