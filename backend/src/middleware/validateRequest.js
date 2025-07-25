// src/middleware/validateRequest.js - CREATE THIS FILE
const { validationResult } = require('express-validator')

const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(400).json({
      message: 'Validation failed',
      errors: errorMessages
    })
  }
  
  next()
}

module.exports = validateRequest