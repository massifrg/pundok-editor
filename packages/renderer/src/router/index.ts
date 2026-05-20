import { createRouter as _createRouter, createWebHistory } from 'vue-router'
import routes from './routes' // or define routes inline

export default function createRouter() {
  return _createRouter({ history: createWebHistory(), routes })
}
