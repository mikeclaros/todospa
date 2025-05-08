from django.conf import settings
from playwright.async_api import Page, expect
import re, pytest, os

os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")
