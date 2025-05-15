from playwright.sync_api import Page, expect, Locator
from django.conf import settings
import pytest, re, time

expect.set_options(timeout=10000)


@pytest.fixture
def server(live_server):
    """fixture to determine whether to test on a django live server or actual live server"""
    import os

    def stop_live_server():
        live_server.stop()
        server = settings.DOMAIN
        return server

    domain_name = os.getenv("DOMAIN_NAME")
    yield live_server if not domain_name else stop_live_server()


class FrontEnd(object):
    """simple data object holds page information"""

    def __init__(self, page, url, username, app_path):
        self.page = page
        self.url = url
        self.username = username
        self.app_path = app_path


@pytest.fixture
def frontend(page: Page, server):
    guest_user_path = "/users/guest/"
    app_path = "/apps/todospa/"
    url = server.url
    page.goto(url + guest_user_path)
    username = _get_user_name(page)
    page.goto(url + app_path)  # page to test on

    # yield {"url": url, "page": page, "username": username, "app_path": app_path}
    yield FrontEnd(page=page, url=url, username=username, app_path=app_path)


def _get_user_name(page: Page):
    element = page.locator("h2").inner_text()
    m = re.search("Guest[0-9]{4}", element)
    username = m.group(0)
    return username


def _finish_tests():
    assert False, f"finish the damn tests!"


class TestFrontPositive:
    title = "this is a title"
    second_title = "this is another title"
    todo = "this is a todo"
    second_todo = "this is another todo"
    DEFAULT_TIMEOUT = 10000
    title_edit = "title has been edited"
    todo_edit = "todo has been edited"

    def test_user_name_on_page(self, frontend):
        expect(frontend.page.locator("h2")).to_have_text(
            re.compile(r"%s's lists" % frontend.username)
        )

    def test_when_logged_out_unable_to_use_app(self, page: Page, server):
        # initially not logged in
        url = server.url
        page.goto(url + "/apps/todospa")

        permission_denied_message = "Forbidden (403)"

        expect(page.locator("h1")).to_have_text(permission_denied_message)

    def test_submitting_a_new_list_title_renders_list_group_item(self, frontend):
        title = "this is a title"
        frontend.page.locator("input").fill(title)
        frontend.page.get_by_role("button", name="Create New List").click()

        frontend.page.get_by_text(title, exact=True).wait_for(
            state="visible", timeout=10000
        )
        title_locator = frontend.page.get_by_text(title, exact=True)
        expect(title_locator).to_have_text(title)

    def _sleep(self, time_in_ms):
        """creating a list has some rerendering issues that will not be fixed right now"""
        """ this time sleep will help with flaky-ness on ci/cd"""

        time.sleep(time_in_ms)

    def test_deleting_list_removes_list(self, frontend):
        title = "this is a title"
        frontend.page.locator("input").fill(title)
        frontend.page.get_by_role("button", name="Create New List").click()

        self._sleep(1)
        frontend.page.get_by_text(title, exact=True).wait_for(
            state="visible", timeout=10000
        )
        title_locator = frontend.page.get_by_text(title, exact=True)
        title_locator.click()

        frontend.page.get_by_role("button", name="Delete List").wait_for(
            state="visible", timeout=5000
        )
        delete_button_locator = frontend.page.get_by_role("button", name="Delete List")
        delete_button_locator.click()

        expect(title_locator).to_have_count(0)

    def test_able_to_create_todo(self, frontend):
        page = frontend.page
        title = "this is a title"
        page.locator("input").fill(title)
        page.get_by_role("button", name="Create New List").click()

        page.get_by_text(title, exact=True).wait_for(state="visible", timeout=10000)

        title_locator = page.get_by_text(title, exact=True)
        title_locator.click()

        todo = "this is a todo"
        # inputs = page.get_by_role("input", name="Add New Todo")
        page.locator('//input[@placeholder="Add New Todo"]').wait_for(
            state="visible", timeout=10000
        )
        page.locator('//input[@placeholder="Add New Todo"]').fill(todo)
        page.get_by_role("button", name="Create New Todo").click()

        page.get_by_text(todo, exact=True).wait_for(state="visible", timeout=15000)
        todo_locator = page.get_by_text(todo, exact=True)
        expect(todo_locator).to_have_text(todo)

    def _create_title(self, page: Page):
        page.locator("input").fill(self.title)
        page.get_by_role("button", name="Create New List").click()

    def _create_open_title(self, page: Page):
        self._create_title(page)
        self._sleep(1)
        page.get_by_text(self.title, exact=True).wait_for(
            state="visible", timeout=self.DEFAULT_TIMEOUT
        )
        title_locator = page.get_by_text(self.title, exact=True)
        # title_locator.click()
        self._retry_click(title_locator, page.locator("input").all()[1])

    def _create_todo(self, page: Page, custom_todo=None):
        page.locator('//input[@placeholder="Add New Todo"]').fill(
            custom_todo or self.todo
        )
        page.get_by_role("button", name="Create New Todo").click()

    def _create_open_todo(self, page: Page):
        self._create_todo(page)

        # page.get_by_text(self.todo, exact=True).wait_for(state="visible", timeout=15000)
        page.get_by_text(self.todo, exact=True).click()

    def test_able_to_delete_todo(self, frontend):
        page: Page = frontend.page
        self._create_open_title(page)
        self._create_open_todo(page)

        todo_locator = page.get_by_text(self.todo, exact=True)

        page.get_by_role("button", name="Delete Todo").wait_for(
            state="visible", timeout=self.DEFAULT_TIMEOUT
        )
        page.get_by_role("button", name="Delete Todo").click()
        expect(todo_locator).to_have_count(0)

    def test_opening_second_title_collapses_first(self, frontend):
        page: Page = frontend.page
        self._create_title(page)

        # create second title
        page.locator("input").fill(self.second_title)
        page.get_by_role("button", name="Create New List").click()
        page.get_by_text(self.second_title, exact=True).wait_for(
            state="visible", timeout=self.DEFAULT_TIMEOUT
        )

        # click first
        first_title_loc = page.get_by_text(self.title, exact=True)
        first_title_id = first_title_loc.get_attribute(name="id")
        first_title_loc.click()

        # click second
        sec_title_loc = page.get_by_text(self.second_title, exact=True)
        sec_title_id = sec_title_loc.get_attribute(name="id")
        sec_title_loc.click()

        # first collapse should be hidden
        expect(page.locator(f'//div[@id="collapse-{sec_title_id}"]')).to_be_visible(
            visible=True
        )
        expect(page.locator(f'//div[@id="collapse-{first_title_id}"]')).to_be_visible(
            visible=False
        )

    def test_opening_second_todo_collapses_first(self, frontend):
        page: Page = frontend.page
        self._create_title(page)
        page.get_by_text(self.title, exact=True).click()

        # app has re-rendering issues would require large overhaul for now this lets locator be found
        self._sleep(1)

        # create todos and get ids
        self._create_todo(page)
        first_todo_loc = page.get_by_text(self.todo, exact=True)
        self._sleep(1)

        second_todo = "second todo"
        self._create_todo(page, custom_todo=second_todo)
        sec_todo_loc = page.get_by_text(second_todo, exact=True)

        first_todo_loc.wait_for()
        sec_todo_loc.wait_for()

        first_id = first_todo_loc.get_attribute(name="id")
        sec_id = sec_todo_loc.get_attribute(name="id")

        # click first
        first_todo_loc.click()
        page.get_by_role("button", name="Delete Todo").wait_for(
            state="visible", timeout=self.DEFAULT_TIMEOUT
        )

        # click second
        sec_todo_loc.click()
        page.get_by_role("button", name="Delete Todo").wait_for(
            state="visible", timeout=self.DEFAULT_TIMEOUT
        )

        expect(page.locator(f'//div[@id="collapse-{first_id}"]')).to_be_visible(
            visible=False
        )
        expect(page.locator(f'//div[@id="collapse-{sec_id}"]')).to_be_visible(
            visible=True
        )

    def test_able_to_edit_title(self, frontend):
        page: Page = frontend.page
        self._create_open_title(page)
        list_id = page.get_by_text(self.title, exact=True).get_attribute(name="id")

        # edit title
        list_edit_button_locator = self._get_edit_button_locator(page, "Edit")
        list_edit_button_locator.click(timeout=self.DEFAULT_TIMEOUT)
        page.locator(f'//input[@value="{self.title}"]').all()[1].fill(self.title_edit)
        page.get_by_role("button", name="Submit").click()

        # check edit
        expect(page.get_by_text(self.title_edit)).to_be_visible()

    def _wait_on(self, locator: Locator):
        locator.wait_for(state="visible", timeout=self.DEFAULT_TIMEOUT)

    def _retry_click(self, clickable: Locator, expected_element: Locator):
        """retry click action on a Locator"""
        import time

        try:
            count = 0
            while not expected_element.is_visible() and count < 3:
                clickable.click()
                count += 1
                time.sleep(1)
                if count > 3:
                    raise TimeoutError(
                        f"too many retries; current allowed retries is {count}"
                    )
        except TimeoutError as e:
            print(e)

    def _get_edit_button_locator(self, page: Page, button_name: str):
        """Grabs all edit buttons and searches inner text for button name"""

        """ this seems necessary because exact=True does not seem to search for exact button name
        and instead returns all buttons that start with Edit idk why"""

        edit_buttons = page.get_by_role("button", name="Edit").all()
        if len(edit_buttons) > 1:
            return list(
                filter(
                    lambda locator: button_name == locator.inner_text(), edit_buttons
                )
            )[0]
        else:
            return edit_buttons[0]

    def test_editing_todo_does_not_clear_previous_entry(self, frontend):
        page: Page = frontend.page
        self._create_open_title(page)
        self._create_open_todo(page)

        # edit todo
        todo_edit_button_locator = page.get_by_role("button", name="todo-edit-button")
        todo_edit_button_locator.click()
        time.sleep(2)

        expect(page.locator("input").all()[2]).to_have_value(self.todo)

    def test_able_to_edit_todo(self, frontend):
        page: Page = frontend.page
        self._create_open_title(page)
        self._create_open_todo(page)

        # edit todo
        todo_edit_button_locator = page.get_by_role("button", name="todo-edit-button")
        todo_edit_button_locator.wait_for(state="visible", timeout=self.DEFAULT_TIMEOUT)
        todo_edit_button_locator.click()
        page.get_by_role("textbox", name="todo-edit-input-box").fill(
            self.todo_edit, timeout=self.DEFAULT_TIMEOUT
        )
        page.get_by_role("button", name="Submit").click()

        # check edit
        expect(page.get_by_text(self.todo_edit)).to_be_visible()

    def test_deleting_list_that_has_todos(self, frontend):
        page: Page = frontend.page
        self._create_open_title(page)
        self._sleep(1)
        self._create_todo(page)
        self._create_todo(page, "second todo")

        todo_locator = page.get_by_text(text=self.todo, exact=True)
        todo_sec_locator = page.get_by_text(text="second todo", exact=True)
        list_locator = page.get_by_text(text=self.title, exact=True)

        # delete list
        page.get_by_role("button", name="Delete List").click(
            timeout=self.DEFAULT_TIMEOUT
        )

        expect(list_locator).to_have_count(0)
        expect(todo_sec_locator).to_be_attached(attached=False)
        expect(todo_locator).to_be_attached(attached=False)

    def test_error_message_displayed_when_sending_empty_string_for_list(self, frontend):
        page: Page = frontend.page
        page.locator("input").fill("")
        page.get_by_role("button", name="Create New List").click()
        alert_message = "Can not be empty. Please fill input to create title."

        expect(page.get_by_role("alert")).to_have_text(alert_message)

    def test_error_message_displayed_when_sending_empty_string_for_todo(self, frontend):
        page: Page = frontend.page
        self._create_open_title(page)
        page.locator('//input[@placeholder="Add New Todo"]').fill("")
        page.get_by_role("button", name="Create New Todo").click()
        alert_message = "Can not be empty. Please fill input to create todo."

        expect(page.get_by_role("alert")).to_have_text(alert_message)

    LIST_INPUT_ARIA = "list-input-box"

    def test_error_message_displayed_is_not_toggled(self, frontend):
        page: Page = frontend.page
        list_input_loc = page.get_by_role("textbox", name=self.LIST_INPUT_ARIA)
        list_input_loc.fill("")
        alert_message = "Can not be empty. Please fill input to create title."

        page.get_by_role("button", name="Create New List").click()
        time.sleep(1)
        page.get_by_role("button", name="Create New List").click()
        time.sleep(1)
        expect(page.get_by_role("alert")).to_have_text(alert_message)
