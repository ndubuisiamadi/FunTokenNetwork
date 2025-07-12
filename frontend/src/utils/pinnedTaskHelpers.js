// Pinned Task Helper Utilities
// Provides reusable functions for handling pinned tasks

/**
 * Get CSS classes for pinned task indicators
 */
export const getPinnedBadgeClasses = (isPinned) => {
  const baseClasses = 'text-xs px-2 py-1 rounded-full font-medium border'
  
  if (isPinned) {
    return `${baseClasses} bg-yellow-500/20 text-yellow-400 border-yellow-500/30`
  }
  
  return `${baseClasses} bg-gray-500/20 text-gray-400 border-gray-500/30`
}

/**
 * Get pinned icon classes for different states
 */
export const getPinnedIconClasses = (isPinned, isHover = false) => {
  const baseClasses = 'w-4 h-4 transition-colors'
  
  if (isPinned) {
    return `${baseClasses} text-yellow-400 ${isHover ? 'hover:text-yellow-500' : ''}`
  }
  
  return `${baseClasses} text-gray-400 ${isHover ? 'hover:text-gray-300' : ''}`
}

/**
 * Get button classes for pin/unpin actions
 */
export const getPinButtonClasses = (isPinned) => {
  const baseClasses = 'p-1 rounded transition-colors'
  
  if (isPinned) {
    return `${baseClasses} text-yellow-400 hover:bg-yellow-500/20`
  }
  
  return `${baseClasses} text-gray-400 hover:bg-gray-500/20`
}

/**
 * Sort tasks with pinned priority
 */
export const sortTasksWithPinned = (tasks, sortField = 'createdAt', sortOrder = 'desc') => {
  return [...tasks].sort((a, b) => {
    // Always prioritize pinned tasks
    if (a.pinned !== b.pinned) {
      return b.pinned ? 1 : -1
    }
    
    // Then sort by specified field
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    // Handle nested fields (e.g., 'task.title')
    if (sortField.includes('.')) {
      const fields = sortField.split('.')
      aVal = fields.reduce((obj, field) => obj?.[field], a)
      bVal = fields.reduce((obj, field) => obj?.[field], b)
    }
    
    // Handle different data types
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }
    
    if (aVal instanceof Date || bVal instanceof Date) {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    }
    
    // Apply sort order
    if (sortOrder === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    }
  })
}

/**
 * Filter tasks to show only pinned ones
 */
export const filterPinnedTasks = (tasks) => {
  return tasks.filter(task => task.pinned === true)
}

/**
 * Filter tasks to show only unpinned ones
 */
export const filterUnpinnedTasks = (tasks) => {
  return tasks.filter(task => !task.pinned)
}

/**
 * Group tasks by pinned status
 */
export const groupTasksByPinned = (tasks) => {
  return {
    pinned: filterPinnedTasks(tasks),
    unpinned: filterUnpinnedTasks(tasks)
  }
}

/**
 * Get pinned task statistics
 */
export const getPinnedTaskStats = (tasks) => {
  const total = tasks.length
  const pinned = filterPinnedTasks(tasks).length
  const unpinned = total - pinned
  const pinnedPercentage = total > 0 ? Math.round((pinned / total) * 100) : 0
  
  return {
    total,
    pinned,
    unpinned,
    pinnedPercentage
  }
}

/**
 * Validate pinned task data
 */
export const validatePinnedTask = (taskData) => {
  const errors = []
  
  if (taskData.pinned !== undefined && typeof taskData.pinned !== 'boolean') {
    errors.push('Pinned field must be a boolean value')
  }
  
  return errors
}

/**
 * Generate pinned task title suffix
 */
export const getPinnedTaskTitle = (title, isPinned) => {
  if (isPinned && !title.includes('📌')) {
    return `📌 ${title}`
  }
  
  if (!isPinned && title.includes('📌')) {
    return title.replace('📌 ', '')
  }
  
  return title
}

/**
 * Get tooltip text for pin actions
 */
export const getPinTooltip = (isPinned) => {
  return isPinned ? 'Unpin task' : 'Pin task to top'
}

/**
 * Get accessibility label for pinned status
 */
export const getPinnedAriaLabel = (isPinned, taskTitle = '') => {
  const status = isPinned ? 'pinned' : 'unpinned'
  return taskTitle 
    ? `Task "${taskTitle}" is ${status}`
    : `Task is ${status}`
}

/**
 * Sort user tasks with pinned task priority
 */
export const sortUserTasksWithPinned = (userTasks, sortField = 'createdAt', sortOrder = 'desc') => {
  return [...userTasks].sort((a, b) => {
    // Prioritize tasks where the underlying task is pinned
    const aPinned = a.task?.pinned || false
    const bPinned = b.task?.pinned || false
    
    if (aPinned !== bPinned) {
      return bPinned ? 1 : -1
    }
    
    // Then sort by specified field
    let aVal, bVal
    
    if (sortField.startsWith('task.')) {
      const taskField = sortField.replace('task.', '')
      aVal = a.task?.[taskField]
      bVal = b.task?.[taskField]
    } else {
      aVal = a[sortField]
      bVal = b[sortField]
    }
    
    // Handle different data types
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }
    
    if (aVal instanceof Date || bVal instanceof Date) {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    }
    
    // Apply sort order
    if (sortOrder === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    }
  })
}

/**
 * Constants for pinned task management
 */
export const PINNED_TASK_CONSTANTS = {
  PIN_ICON: '📌',
  PIN_EMOJI: '📌',
  MAX_PINNED_TASKS: 10, // Configurable limit
  PINNED_INDICATOR_CLASS: 'pinned-task-indicator',
  PINNED_TASK_CLASS: 'pinned-task'
}

/**
 * Check if a task should be highlighted as pinned
 */
export const shouldHighlightPinned = (task, currentTime = new Date()) => {
  if (!task.pinned) return false
  
  // Could add additional logic here, e.g.:
  // - Only highlight pinned tasks created within last 24 hours
  // - Only highlight during certain time periods
  // - Check user preferences
  
  return true
}