// AI服务输入验证中间件
// 防止SQL注入、XSS和其他安全漏洞

import { NextRequest } from 'next/server'
import { logger } from '@/lib/ai/services'

export interface ValidationError {
  field: string
  code: string
  message: string
  value?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  sanitizedData?: any
}

export class InputValidator {
  private static instance: InputValidator

  static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator()
    }
    return InputValidator.instance
  }

  /**
   * 验证笔记内容
   */
  validateNoteContent(content: any): ValidationResult {
    const errors: ValidationError[] = []

    // 检查类型
    if (typeof content !== 'string') {
      errors.push({
        field: 'content',
        code: 'INVALID_TYPE',
        message: 'Content must be a string'
      })
      return { isValid: false, errors }
    }

    // 检查长度
    if (content.length === 0) {
      errors.push({
        field: 'content',
        code: 'EMPTY_CONTENT',
        message: 'Content cannot be empty'
      })
    }

    if (content.length < 10) {
      errors.push({
        field: 'content',
        code: 'CONTENT_TOO_SHORT',
        message: 'Content must be at least 10 characters long'
      })
    }

    if (content.length > 100000) {
      errors.push({
        field: 'content',
        code: 'CONTENT_TOO_LONG',
        message: 'Content cannot exceed 100,000 characters'
      })
    }

    // 清理和验证内容
    const sanitizedContent = this.sanitizeText(content)

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: sanitizedContent
    }
  }

  /**
   * 验证笔记标题
   */
  validateNoteTitle(title: any): ValidationResult {
    const errors: ValidationError[] = []

    // 检查类型
    if (typeof title !== 'string') {
      errors.push({
        field: 'title',
        code: 'INVALID_TYPE',
        message: 'Title must be a string'
      })
      return { isValid: false, errors }
    }

    // 检查长度
    if (title.length === 0) {
      errors.push({
        field: 'title',
        code: 'EMPTY_TITLE',
        message: 'Title cannot be empty'
      })
    }

    if (title.length > 200) {
      errors.push({
        field: 'title',
        code: 'TITLE_TOO_LONG',
        message: 'Title cannot exceed 200 characters'
      })
    }

    // 清理标题
    const sanitizedTitle = this.sanitizeText(title)

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: sanitizedTitle
    }
  }

  /**
   * 验证分析选项
   */
  validateAnalysisOptions(options: any): ValidationResult {
    const errors: ValidationError[] = []

    if (!options || typeof options !== 'object') {
      errors.push({
        field: 'options',
        code: 'INVALID_TYPE',
        message: 'Options must be an object'
      })
      return { isValid: false, errors }
    }

    // 验证分析类型
    if (options.type) {
      const validTypes = ['summary', 'classification', 'tags', 'sentiment', 'full']
      if (!validTypes.includes(options.type)) {
        errors.push({
          field: 'options.type',
          code: 'INVALID_ANALYSIS_TYPE',
          message: `Invalid analysis type. Must be one of: ${validTypes.join(', ')}`
        })
      }
    }

    // 验证优先级
    if (options.priority) {
      const validPriorities = ['low', 'normal', 'high']
      if (!validPriorities.includes(options.priority)) {
        errors.push({
          field: 'options.priority',
          code: 'INVALID_PRIORITY',
          message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
        })
      }
    }

    // 验证模型名称
    if (options.model) {
      if (typeof options.model !== 'string' || options.model.length > 100) {
        errors.push({
          field: 'options.model',
          code: 'INVALID_MODEL',
          message: 'Model must be a string with max 100 characters'
        })
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: options
    }
  }

  /**
   * 验证ID字段
   */
  validateId(id: any, fieldName: string = 'id'): ValidationResult {
    const errors: ValidationError[] = []

    if (!id) {
      errors.push({
        field: fieldName,
        code: 'MISSING_ID',
        message: `${fieldName} is required`
      })
      return { isValid: false, errors }
    }

    if (typeof id !== 'string') {
      errors.push({
        field: fieldName,
        code: 'INVALID_TYPE',
        message: `${fieldName} must be a string`
      })
      return { isValid: false, errors }
    }

    // 验证UUID格式或基本ID格式
    const idPattern = /^[a-zA-Z0-9\-_]{1,50}$/
    if (!idPattern.test(id)) {
      errors.push({
        field: fieldName,
        code: 'INVALID_ID_FORMAT',
        message: `${fieldName} contains invalid characters`
      })
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: id
    }
  }

  /**
   * 验证用户ID
   */
  validateUserId(userId: any): ValidationResult {
    return this.validateId(userId, 'userId')
  }

  /**
   * 验证笔记ID
   */
  validateNoteId(noteId: any): ValidationResult {
    return this.validateId(noteId, 'noteId')
  }

  /**
   * 验证分页参数
   */
  validatePaginationParams(page: any, limit: any): ValidationResult {
    const errors: ValidationError[] = []

    // 验证页码
    if (page !== undefined) {
      const pageNum = parseInt(page)
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push({
          field: 'page',
          code: 'INVALID_PAGE',
          message: 'Page must be a positive integer'
        })
      } else if (pageNum > 1000) {
        errors.push({
          field: 'page',
          code: 'PAGE_TOO_LARGE',
          message: 'Page cannot exceed 1000'
        })
      }
    }

    // 验证限制数量
    if (limit !== undefined) {
      const limitNum = parseInt(limit)
      if (isNaN(limitNum) || limitNum < 1) {
        errors.push({
          field: 'limit',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive integer'
        })
      } else if (limitNum > 100) {
        errors.push({
          field: 'limit',
          code: 'LIMIT_TOO_LARGE',
          message: 'Limit cannot exceed 100'
        })
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10
      }
    }
  }

  /**
   * 验证日期范围
   */
  validateDateRange(dateFrom: any, dateTo: any): ValidationResult {
    const errors: ValidationError[] = []

    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      if (isNaN(fromDate.getTime())) {
        errors.push({
          field: 'dateFrom',
          code: 'INVALID_DATE',
          message: 'dateFrom must be a valid date'
        })
      }

      // 检查日期是否太早或太晚
      const now = new Date()
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

      if (fromDate < oneYearAgo || fromDate > oneYearLater) {
        errors.push({
          field: 'dateFrom',
          code: 'DATE_OUT_OF_RANGE',
          message: 'dateFrom must be within one year of current date'
        })
      }
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      if (isNaN(toDate.getTime())) {
        errors.push({
          field: 'dateTo',
          code: 'INVALID_DATE',
          message: 'dateTo must be a valid date'
        })
      }
    }

    // 检查日期范围逻辑
    if (dateFrom && dateTo && errors.length === 0) {
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)

      if (fromDate > toDate) {
        errors.push({
          field: 'dateRange',
          code: 'INVALID_DATE_RANGE',
          message: 'dateFrom must be before or equal to dateTo'
        })
      }

      // 检查范围是否过大（不超过一年）
      const rangeInDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      if (rangeInDays > 365) {
        errors.push({
          field: 'dateRange',
          code: 'DATE_RANGE_TOO_LARGE',
          message: 'Date range cannot exceed one year'
        })
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined
      }
    }
  }

  /**
   * 清理文本内容
   */
  private sanitizeText(text: string): string {
    if (!text) return text

    // 移除控制字符（除了换行符和制表符）
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // 限制连续换行符
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n')

    // 移除前后空白
    sanitized = sanitized.trim()

    return sanitized
  }

  /**
   * 综合验证AI分析请求
   */
  validateAnalysisRequest(data: any): ValidationResult {
    const allErrors: ValidationError[] = []
    let sanitizedData: any = {}

    // 验证必填字段
    const requiredFields = ['userId', 'noteId', 'noteTitle', 'noteContent']
    for (const field of requiredFields) {
      if (!data[field]) {
        allErrors.push({
          field,
          code: 'MISSING_REQUIRED_FIELD',
          message: `${field} is required`
        })
      }
    }

    if (allErrors.length > 0) {
      return { isValid: false, errors: allErrors }
    }

    // 验证各个字段
    const validations = [
      this.validateUserId(data.userId),
      this.validateNoteId(data.noteId),
      this.validateNoteTitle(data.noteTitle),
      this.validateNoteContent(data.noteContent),
      this.validateAnalysisOptions(data.options || {})
    ]

    for (const validation of validations) {
      if (!validation.isValid) {
        allErrors.push(...validation.errors)
      } else {
        Object.assign(sanitizedData, validation.sanitizedData)
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedData
    }
  }
}

// 导出单例实例
export const inputValidator = InputValidator.getInstance()

// 导出便捷函数
export const validateAnalysisRequest = (data: any) => inputValidator.validateAnalysisRequest(data)
export const validateNoteContent = (content: any) => inputValidator.validateNoteContent(content)
export const validatePaginationParams = (page: any, limit: any) => inputValidator.validatePaginationParams(page, limit)