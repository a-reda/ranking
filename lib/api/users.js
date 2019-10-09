import sendRequest from './sendRequest'

const BASE_PATH = '/api/v1/users'

export const getUsersList = () =>
  sendRequest(`${BASE_PATH}/get`, {
    method: 'GET'
  })

export const getUsersBySlug = slug =>
  sendRequest(`${BASE_PATH}/get/${slug}`, {
    method: 'GET'
  })

export const addNewUser = user =>
  sendRequest(`${BASE_PATH}/add`, {
    body: JSON.stringify(user)
  })

export const updateUser = user =>
  sendRequest(`${BASE_PATH}/update`, {
    body: JSON.stringify(user)
  })

export const deleteUser = userId =>
  sendRequest(`${BASE_PATH}/delete/${userId}`, {
    method: 'DELETE'
  })

  export const getUsersStats = (start, end) =>
  sendRequest(`${BASE_PATH}/stats?start=${start}&end=${end}`, {
    method: 'GET'
  })
