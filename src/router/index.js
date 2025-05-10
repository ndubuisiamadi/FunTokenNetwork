import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from '../views/SignUpView.vue'
import HomeView from '../views/HomeView.vue'
import TasksView from '../views/TasksView.vue'
import MessagesView from '../views/MessagesView.vue'
import FriendsView from '@/views/FriendsView.vue'
import CommunitiesView from '@/views/CommunitiesView.vue'
import UserProfileView from '@/views/UserProfileView.vue'
import CommunityView from '@/views/CommunityView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/sign-up',
      name: 'sign-up',
      component: SignUpView,
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksView,
    },
    {
      path: '/messages',
      name: 'messages',
      component: MessagesView,
    },
    {
      path: '/communities',
      name: 'communities',
      component: CommunitiesView,
    },
    {
      path: '/friends',
      name: 'friends',
      component: FriendsView,
    },
    {
      path: '/community',
      name: 'community',
      component: CommunityView,
    },
    {
      path: '/user-profile',
      name: 'user-profile',
      component: UserProfileView,
    }
  ],
})

export default router
