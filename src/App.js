import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Stack,
  Button,
  Form,
  InputGroup,
  Container,
  ListGroup,
  Collapse,
  Alert
} from 'react-bootstrap'

axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN'
axios.defaults.xsrfCookieName = 'csrftoken'
axios.defaults.withCredentials = true

export default function App ({ datas }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([]) // lists data
  const [input, setInput] = useState('')
  const [todoError, setTodoError] = useState(false)
  const [listError, setListError] = useState(false)

  const [open, setOpen] = useState({})
  const [todoOpen, setTodoOpen] = useState({})
  const [listParentId, setListParentId] = useState('')
  const [todoParentId, setTodoParentId] = useState('')
  const [textList, setTextList] = useState([])

  const apiListsUrl = '/apis/todolists/lists/'

  const genError = (error) => console.error(`Error ${error}`)

  const initFetchData = async (active) => {
    console.log('running initFetchData')
    console.log('listParentId: ', listParentId, ' active: ', active)

    // get lists
    const listsData = await axios
      .get(apiListsUrl)
      .then((res) => {
        console.log('listsData: ', res.data)
        return res.data
      })
      .catch((error) => {
        genError(error)
      })

    console.log('listsData: ', listsData)
    // order list by id
    listsData.sort((a, b) => a.id - b.id)

    // get todos
    const todosData = (listParentId) ? await axios.get(apiListsUrl + listParentId).then((res) => { return res.data }).catch((error) => { genError(error) }) : []

    console.log('todosData to go in textList ', todosData)
    if (active) {
      setData(listsData)
      setLoading(true)
      setTextList(todosData)
      setLoading(false)
    }
  }

  const fetchData = async (listParentId, edited = false) => {
    console.log('in fetchData...')
    // get lists
    const listsData = await axios
      .get(apiListsUrl)
      .then((res) => {
        return res.data
      })
      .catch((error) => {
        genError(error)
      })

    console.log('fetchData, listParentid? ', listParentId)
    const todosData = (listParentId) ? await axios.get(apiListsUrl + listParentId).then((res) => { return res.data }).catch((error) => { genError(error) }) : []

    console.log('old listsData: ', data, '\n old todosData: ', textList)
    console.log('received listsData: ', listsData, '\nreceived todosData: ', todosData)

    if (!edited) {
      let newData = null
      if (data.length < listsData.length || data.length === listsData.length) {
        // if list data is the same, edited, or new data
        // merge arrays to retain their original ordering

        newData = listsData.reduce((acc, dObj) => {
          let val = acc.some(item => item.id === dObj.id)
          console.log('val: ', val)
          if (!val) {
            // item not in original
            acc.push(dObj)
          }
          return acc
        }, data)
        console.log('merged: ', newData)
      } else {
        // a list obj was deleted
        console.log('list was deleted\nnew list: ', listsData)
        //ensure correct ordering by mapping by id and assign to newData
        newData = listsData.sort((a, b) => a.id - b.id)

      }

      console.log('data: ', data, '\nlistsData: ', listsData, '\nset: ', newData)

      setData(newData)
      setTextList(todosData)
    } else {
      // edits were made
      console.log('fetchData edit')
      //allow type conversions from == otherwise the edits will not go through
      let listObj = listsData.find((item) => item.id == listParentId)
      setData(data.map(item => {
        console.log('item: ', item)
        if (listParentId == item.id) {
          console.log('attempt edit: ', listObj.title)
          return { ...item, title: listObj.title }
        } else {
          return item
        }
      }))
    }
  }

  const checkCookie = () => {
    console.log('drilled....works?', datas.cookie)
  }

  useEffect(() => {
    let active = true
    initFetchData(active)
    return () => {
      active = false
    }
  }, [])

  const handleOpenUpdate = async (e) => {
    const id = e.target.attributes.id.value

    console.log('handleOpenUpdate ', e)

    if (id.includes('todo')) {
      setTodoParentId(id)
      let keyToClose = -1
      console.log('todoOpen: ', todoOpen)
      for (const key in todoOpen) {
        if (todoOpen[key]) {
          keyToClose = key
        }
      }

      const idNum = id.replace('todo-', '')
      if (idNum > 0) {
        console.log('attempt close todo: ', keyToClose)
        const updateValue = { [keyToClose]: !todoOpen[keyToClose], [id]: !todoOpen[id] }
        setTodoOpen({ ...todoOpen, ...updateValue })
      } else {
        setTodoOpen({ ...todoOpen, [id]: !todoOpen[id] })
        // setTextList([])
      }
    } else {
      setListParentId(id)
      // find if any other elements are open and if they are close them
      let keyToClose = -1
      for (const key in open) {
        if (open[key]) {
          keyToClose = key
        }
      }

      if (id !== keyToClose && keyToClose > 0) {
        setTextList((t) => []) // reset list when swapping to another parent id
      }

      console.log('handleOpenUpdate open? ', open, '\nid? ', id, '\nid to close ', keyToClose)

      if (keyToClose > 0) {
        console.log('attempt close ', keyToClose)
        const updateValue = { [keyToClose]: !open[keyToClose], [id]: !open[id] }
        setOpen({ ...open, ...updateValue })
      } else {
        setOpen({ ...open, [id]: !open[id] })
        setTextList([])
      }

      console.log('exiting...handleOpenUpdate open? ', open, '\nid? ', id, '\nid to close ', keyToClose)
      await fetchData(id)
    }
  }

  const TodoListComponent = ({ textList, id }) => {
    const [showEdit, setShowEdit] = useState({})
    const [edit, setEdit] = useState('')
    const [editValue, setEditValue] = useState('')

    const deleteTodo = async () => {
      const todoIdNum = todoParentId.replace('todo-', '')
      const path = '/apis/todolists/lists/' + listParentId + '/' + todoIdNum + '/edit'
      console.log('delete path: ', path, '\ncookies here? ', datas.cookie)
      axios.delete(path, { headers: { 'X-CSRFToken': datas.cookie } })
        .then((res) => {
          console.log('delete', res)
        })
        .catch((e) => {
          console.error(e)
        })
      await fetchData(listParentId)
    }

    const editTodo = (e) => {
      console.log(e)

      const todoId = e.target.parentElement.previousElementSibling.attributes[0].value.replace('todo-', '')
      const update = { [todoId]: !showEdit[todoId] }
      setShowEdit({ ...showEdit, ...update })
      console.log('in edit todo what is e.target.parentElement.value? ', e.target.parentElement.previousSibling.firstChild.textContent)
      if (showEdit) {
        setEditValue(e.target.parentElement.previousSibling.firstChild.textContent)
        console.log('setting setEditValue')
      }
      console.log('showedit...', showEdit)
    }

    const submitEdit = async (e) => {
      const todoIdNum = todoParentId.replace('todo-', '')
      const path = '/apis/todolists/lists/' + listParentId + '/' + todoIdNum + '/edit'
      const data = { text: edit }
      console.log('edit path: ', path)
      await axios.put(
        path,
        data,
        { headers: { 'X-CSRFToken': datas.cookie } }
      )
        .then((res) => console.log(res))
        .catch((error) => console.error(error))
      await fetchData(listParentId)
    }

    const editInputChange = (e) => {
      console.log('editChange, ', e.target.value)
      const editValue = e.target.value ? e.target.value : new String('') // need to allow empty string to display
      setEditValue(editValue)
      setEdit(e.target.value)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') submitEdit()
    }

    return (
      <Container>
        <ListGroup key={id}>
          {
            textList.map((item) =>
              (item.text !== '') ?
                <Container key={'c-' + item.id}>
                    {
                    (!showEdit[item.id]) ?
                        <ListGroup.Item key={item.id} onClick={handleOpenUpdate} id={'todo-' + item.id} action variant='light'>
                            {item.text}
                        </ListGroup.Item>
                        :
                        <InputGroup className='mb-3' id={'todo-' + item.id}>
                        <Form.Control
                            type='text'
                            value={editValue || item.text}
                            onChange={editInputChange}
                            onKeyDown={handleKeyDown}
                        />
                        <Button variant='outline-secondary' id={'edit-' + item.id} onClick={submitEdit}>Submit</Button>
                        </InputGroup>
                    }
                    <Collapse in={todoOpen['todo-' + item.id]} id={'collapse-todo-' + item.id}>
                        <div>
                        <Button variant='secondary' onClick={editTodo} style={{ padding: '1px' }} id={item.id}>Edit</Button>
                        <Button variant='danger' onClick={deleteTodo} style={{ padding: '1px' }}>Delete Todo</Button>
                        </div>
                    </Collapse>
                </Container>
                :
                <span key={item.id} />
            )
        }
        </ListGroup>
      </Container>
    )
  }

  const CustomTodoForm = ({ id }) => {
    const [todoText, setTodoText] = useState({})
    const [itemId, setItemId] = useState('')

    const onTodoTextChange = (e) => {
      const itemId = e.target.attributes.itemid.value
      setItemId(itemId)
      const updateValue = { [itemId]: e.target.value }
      setTodoText({ ...todoText, ...updateValue })
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        createNewTodo()
      }
    }

    const createNewTodo = async () => {
      console.log('in createNewTodo: ', todoText)
      checkCookie()
      // prepare data to send
      const inputData = { text: todoText[itemId], list_parent: itemId }
      const token = datas.cookie
      inputData.csrfmiddlewaretoken = token
      const path = '/apis/todolists/lists/' + itemId
      console.log('sending to ', path, '\nwith: ', inputData)

      const postNewTodo = async (path, inputData) => {
        await axios.post(
          path,
          inputData,
          { headers: { 'X-CSRFToken': inputData.csrfmiddlewaretoken } }
        )
          .then((res) => {
            console.log('posted new todo\n', res)
          })
          .catch((e) => {
            setTodoError(true)
            console.error(e)
          })
      }
      await postNewTodo(path, inputData)
      await fetchData(itemId)
    }

    return (
      <InputGroup className='mb-4' id={id}>
        <Form.Control
          itemID={id}
          placeholder='Add New Todo'
          aria-label='todo input with button'
          aria-describedby='basic-addon3'
          type='text'
          value={todoText[id] || ''}
          onChange={onTodoTextChange}
          onKeyDown={handleKeyDown}
        />
        <Button
          variant='outline-secondary'
          id='button-addon3'
          onClick={createNewTodo}
        >
          Create New Todo
        </Button>
        <Alert
          show={todoError}
          variant='danger'
          onClose={() => setTodoError(false)}
          dismissible
          className='mt-1 w-75'
        >
          <Alert.Heading></Alert.Heading>
          <p>Can not be empty. Please fill input to create todo.</p>
        </Alert>
        <Container>
          <div id='display-todo'>
            <TodoListComponent key={id} textList={textList} id={id} />
          </div>
        </Container>
      </InputGroup>
    )
  }

  const CustomListGroupComp = ({ data }) => {
    const [edit, setEdit] = useState('')
    const [editValue, setEditValue] = useState('')
    const [showEdit, setShowEdit] = useState({})

    const deleteList = async () => {
      const path = '/apis/todolists/lists/' + listParentId + '/edit'
      console.log('delete list: ', path)
      await axios.delete(path, { headers: { 'X-CSRFToken': datas.cookie } })
        .then((res) => {
          console.log(res)
        })
        .catch((error) => {
          console.error(error)
        })
      const resetList = null
      setListParentId(resetList)
      await fetchData(resetList)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') submitEdit()
    }

    const editList = (e) => {
      console.log(e)

      const update = { [listParentId]: !showEdit[listParentId] }
      setShowEdit({ ...showEdit, ...update })
      console.log('in edit list what is e.target.parentElement.value? ', e.target.parentElement.previousSibling.firstChild.textContent)
      if (showEdit) {
        setEditValue(e.target.parentElement.previousSibling.firstChild.textContent)
        console.log('setting setEditValue')
      }
      console.log('showedit...', showEdit)
    }

    const submitEdit = async (e) => {
      const path = '/apis/todolists/lists/' + listParentId + '/edit'
      const data = { title: edit }
      console.log('edit path: ', path)
      await axios.put(
        path,
        data,
        { headers: { 'X-CSRFToken': datas.cookie } }
      )
        .then((res) => console.log('list edit submit: ', res))
        .catch((error) => console.error(error))
      await fetchData(listParentId, true)
    }

    const editInputChange = (e) => {
      console.log('List editChange, ', e.target.value)
      const editValue = e.target.value ? e.target.value : new String('')
      setEditValue(editValue)
      setEdit(e.target.value)
    }

    return (
      <ListGroup style={{ width: '22rem' }}>
        {data.map((item) => (
          <Container key={item.id}>
            {
              (!showEdit[item.id]) ?
              <ListGroup.Item
                    id={item.id}
                    onClick={handleOpenUpdate}
                    aria-controls={item.id}
                    aria-expanded={open[item.id]}
                    action
                    variant='light'
                  >
                  {item.title}
                </ListGroup.Item>
              :
              <InputGroup className='mb-3' id={'list-' + item.id}>
                  <Form.Control
                    type='text'
                    value={editValue || item.text}
                    onChange={editInputChange}
                    onKeyDown={handleKeyDown}
                  />
                  <Button variant='outline-secondary' id={'edit-' + item.id} onClick={submitEdit}>Submit</Button>
                </InputGroup>
            }
            <Collapse in={open[item.id]} id={'collapse-' + item.id}>
              <div>
                <Button variant='danger' onClick={deleteList} style={{ padding: '1px' }} >Delete List</Button>
                <Button variant='secondary' onClick={editList} style={{ padding: '1px' }} >Edit List</Button>
                <CustomTodoForm id={item.id} />
              </div>
            </Collapse>
          </Container>
        ))}
      </ListGroup>
    )
  }

  const ListComponent = ({ data }) => {
    for (const item in data) {
      const id = data[item].id
      open[id] = open[id] || false
      // console.log(`open[id]: ${open[id]}\nid: ${id}`)
    }
    return (
      <div>
        <CustomListGroupComp data={data} />
      </div>
    )
  }

  const createNewList = async () => {
    console.log(`in createNewList ${input}\n`)
    checkCookie()
    const postNewList = async () => {
      const inputData = { title: input }
      const token = datas.cookie
      inputData.csrfmiddlewaretoken = token

      await axios.post(
        '/apis/todolists/lists/',
        inputData,
        { headers: { 'X-CSRFToken': inputData.csrfmiddlewaretoken } }
      )
        .then((res) => {
          console.log('submitted new list\n', res)
        })
        .catch((error) => {
          setListError((lE) => !lE)
          console.log('list error...', listError)
          console.error(error)
        })
    }
    await postNewList()
    await fetchData(listParentId)
  }

  const inputChange = (e) => {
    setInput(e.target.value)
  }

  return (
    <div>
      <h2>{datas.user}'s lists</h2>
      <Stack direction='horizontal' gap={2} style={{ width: '44rem' }}>
        <InputGroup className='mb-3'>
          <Form.Control
            placeholder='Create a new list (Can press Enter to submit)'
            aria-label='Example text with button addon'
            aria-describedby='basic-addon1'
            type='text'
            value={input}
            onChange={inputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createNewList()
              }
            }}
          />
          <Button
            variant='outline-secondary'
            id='button-addon1'
            onClick={createNewList}
          >
            Create New List
          </Button>
        </InputGroup>
      </Stack>
      <Alert
        show={listError}
        variant='danger'
        onClose={() => setListError(false)}
        dismissible
        className='mt-1 w-50'
      >
        <Alert.Heading></Alert.Heading>
        <p>Can not be empty. Please fill input to create title.</p>
      </Alert>
      {loading && <div>Loading</div>}
      {!loading && (
        <div>
          <h3>List of lists</h3>
          <ListComponent data={data} />
        </div>
      )}
    </div>
  )
}
