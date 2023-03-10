const API = (function () {
    function myFetch({ method, url, body, headers }) {
        return new Promise(function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText,
                    });
                }
            };
            xhr.onerror = function () {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                });
            };
            if (headers) {
                Object.keys(headers).forEach(function (key) {
                    xhr.setRequestHeader(key, headers[key]);
                });
            }

            if (body && typeof body === "object") {
                body = JSON.stringify(body);
            }
            xhr.send(body);
        });
    }
    const createTodo = async function (newTodo) {
        let data = await myFetch({
            url: "http://localhost:3000/todos",
            method: "POST",
            body: newTodo,
            headers: {
                "Content-Type": "application/json",
            },
        });
        data = JSON.parse(data);
        console.log("created: ", data);
        return data;
    };

    const deleteTodo = async function (id) {
        let data = await myFetch({
            url: `http://localhost:3000/todos/${id}`,
            method: "DELETE",
        });

        data = JSON.parse(data);
        return data;
    };

    const getTodos = async function () {
        let data = await myFetch({
            url: "http://localhost:3000/todos",
            method: "GET",
        });
        data = JSON.parse(data);
        return data;
    };

    const updateTodo = async function (editedTodo) {
        let data = await myFetch({
            url: `http://localhost:3000/todos/${editedTodo.id}`,
            method: "PUT",
            body: editedTodo,
            headers: {
                "Content-Type": "application/json",
            },
        });
        data = JSON.parse(data);
        return data;
    };

    return { createTodo, deleteTodo, getTodos, updateTodo };
})();

const Model = (function () {
    class State {
        #onChange;
        #todoListData;

        constructor() {
            this.#todoListData = [];
        }

        set todoListData(newTodoListData) {
            // 只要有所改变就要调用 onChange function
            this.#todoListData = newTodoListData;
            if (this.#onChange) {
                console.log("this.#onChange invoked");
                this.#onChange();
            } else {
                console.log("this.#onChange() is undefined");
            }
        }

        get todoListData() {
            return this.#todoListData;
        }

        subscribe(callback) {
            this.#onChange = callback;
        }
    }

    const { createTodo, deleteTodo, getTodos, updateTodo } = API;

    return {
        createTodo,
        deleteTodo,
        getTodos,
        updateTodo,
        State,
    };
})();

const View = (function () {
    const addButtonEle = document.querySelector("#submit-btn");
    const todoInputEle = document.querySelector("#todo-input");
    const pendingListEle = document.querySelector("#pending-list");
    const completedListEle =
        document.querySelector("#completed-list");

    function renderList(listData) {
        console.log(listData);
        if (listData.length === 0) {
            pendingListEle.innerHTML = "<h5>No Content to Show</h5>";
            completedListEle.innerHTML =
                "<h5>No Content to Show</h5>";
            return;
        }
        /*
        listData: [{
            "content": "123",
            "pending": true,
            "id": 1
            }
        ]
        */
        let pendingTemplate = "";
        let completedTemplate = "";
        for (let i = 0; i < listData.length; i++) {
            const { content, id, pending } = listData[i];
            if (pending === true) {
                const newLPendingItemTemplate = ` 
                    <li> 
                    <input type="text" id=${id} value="${content}" readonly> 
                    <button data-id=${id} class="edit-button">✎</button> 
                    <button data-id=${id} class="delete-button">🗑</button> 
                    <button data-id=${id} class="push-button">🠖</button> </li> 
                `;
                pendingTemplate += newLPendingItemTemplate;
            } else {
                const newCompleteItemTemplate = `
                    <li>
                    <button data-id=${id} class="pull-button">🠔</button>
                    <input type="text" id=${id} value="${content}" readonly>
                    <button data-id=${id} class="delete-button">🗑</button>
                    <button data-id=${id} class="edit-button">✎</button>
                    </li>
                `;
                completedTemplate += newCompleteItemTemplate;
            }
        }

        pendingListEle.innerHTML = pendingTemplate;
        completedListEle.innerHTML = completedTemplate;
    }

    function clearInput() {
        todoInputEle.value = "";
    }

    return {
        addButtonEle,
        pendingListEle,
        todoInputEle,
        completedListEle,
        renderList,
        clearInput,
    };
})();

const Controller = (function (view, model) {
    const { createTodo, deleteTodo, getTodos, updateTodo, State } =
        model;
    const {
        addButtonEle,
        pendingListEle,
        completedListEle,
        todoInputEle,
        renderList,
        clearInput,
    } = view;

    // state contains all the data in the application(todoListData)
    const state = new State();

    const initialize = async function () {
        const data = await getTodos();
        // 自动调用 setter function - todoListData
        state.todoListData = data;
        console.log("init data is ", state.todoListData);
    };

    addButtonEle.addEventListener("click", async function () {
        /*
        1. read the value from input
        2. post the new item to server
        3. update todoListData, at the same time, the getter will be invoked
        4. clear the input
        */
        const itemValue = todoInputEle.value;
        const newTodo = await createTodo({
            content: itemValue,
            pending: true,
        });
        // add the new todo data to the current data storage
        state.todoListData = [...state.todoListData, newTodo];

        clearInput();
    });

    const handleDelete = function (event) {
        if (event.target.getAttribute("class") !== "delete-button")
            return;

        /*
         * 1. get the deleteButton Element
         * 2. get the id of corresponding list item
         * 3. delete data from the server
         * 3. update todoListData, at the same time, the getter will be invoked
         */

        const deleteButton = event.target;
        const deletedItemId = deleteButton.getAttribute("data-id");

        const filteredListData = state.todoListData.filter(
            (itemData) => itemData.id !== parseInt(deletedItemId)
        );

        deleteTodo(deletedItemId);
        state.todoListData = filteredListData;
    };

    const handlePushPull = async function (event, method, className) {
        /*
         * 1. check if the Element is "🠔 / 🠖"
         * 2. get the push/pull Element
         * 3. get the id of corresponding list item
         * 4. update pending property in the server
         * 5. update the item with itemId in the todoListData, at the same time, the getter will be invoked
         */
        if (event.target.getAttribute("class") === className) {
            const button = event.target;
            const itemId = parseInt(button.getAttribute("data-id"));

            let editedTodo = {};
            for (let i = 0; i < state.todoListData.length; i++) {
                let curTodoItem = state.todoListData[i];
                if (curTodoItem.id === itemId) {
                    editedTodo = {
                        ...curTodoItem,
                        pending: !curTodoItem.pending,
                    };
                    break;
                }
            }

            await deleteTodo(itemId);
            const newTodo = await createTodo(editedTodo);
            console.log("newTodo", newTodo);
            const filteredListData = state.todoListData.filter(
                (itemData) => itemData.id !== itemId
            );
            filteredListData.push(newTodo);
            console.log(
                `$After {method} item with id: ${itemId}, new data: ${JSON.stringify(
                    filteredListData
                )}`
            );

            state.todoListData = filteredListData;
        }
    };

    // * 用于编辑 todo item
    const handleEdit = function (event) {
        /*
         * 1. check if the clicked element is "edit"
         * 2. get the data-id attribute from the button
         * 3. get the corresponding input element based on the id
         * 4. toggle the readonly attribute,
         * 5. when readonly attribute is removed,
         *      5.1 allow user to edit the input text
         * 6. when readonly attribute is activated, means user has finished editing
         *      6.1 update pending property in the server
         *      6.2 update the item with itemId in the todoListData, at the same time, the getter will be invoked
         */
        if (event.target.getAttribute("class") === "edit-button") {
            const button = event.target;
            const itemId = parseInt(button.getAttribute("data-id"));
            let inputItemEle = event.currentTarget.querySelector(
                `[id='${itemId}']`
            );

            inputItemEle.toggleAttribute("readonly");
            if (inputItemEle.hasAttribute("readonly") === false) {
                // * if current input status is not readonly, means we can edit the item text
                inputItemEle.style.backgroundColor = "#f0f0f0";
                inputItemEle.focus();
            } else {
                // * if current input status is readonly again, means we can to update the updated item to the json server, also update the display
                let editedTodo = {};
                let inputVal = inputItemEle.value;
                console.log("current edit value is ", inputVal);
                inputItemEle.style.backgroundColor = "white";

                for (let i = 0; i < state.todoListData.length; i++) {
                    let curTodoItem = state.todoListData[i];
                    if (curTodoItem.id === itemId) {
                        editedTodo = {
                            ...curTodoItem,
                            content: inputVal,
                        };
                        curTodoItem.content = inputVal;
                        break;
                    }
                }

                updateTodo(editedTodo);
                console.log(
                    "After update, data is ",
                    JSON.stringify(state.todoListData)
                );
                state.todoListData = [...state.todoListData];
            }
        }
    };

    pendingListEle.addEventListener("click", function (event) {
        // * 用于从 pending list 中删除 todo item
        handleDelete(event);
        // * 用于将 todo item 从 completedListEle 中 push 到 pendingListEle
        handlePushPull(event, "push", "push-button");
        // * 用于编辑 todo item
        handleEdit(event);
    });

    completedListEle.addEventListener("click", function (event) {
        // * 用于从 completed list 中删除 todo item
        handleDelete(event);
        // * 用于将 todo item 从 pendingListEle 中 push 到 completedListEle
        handlePushPull(event, "pull", "pull-button");
        // * 用于编辑 todo item
        handleEdit(event);
    });

    const bootstrap = function () {
        const subscribedFunc = function () {
            renderList(state.todoListData);
        };
        state.subscribe(subscribedFunc);

        // 首先 initialize the state listData, 同时也会进行 renderList function 的激发, 因为这个操作是 asynchronous 的操作, 所以虽然 subscribe 定义在下面, 依然能够先一步执行, 使得最上面的 #onChange 能够不为 undefined
        initialize();
        // console.log("bootstrap is ", state.todoListData);
    };
    return { bootstrap };
})(View, Model);

const { bootstrap } = Controller;
bootstrap();
