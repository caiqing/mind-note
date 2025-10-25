/**
 * Editor Utilities
 *
 * Utility functions for rich text editor operations
 */

export const stripHTML = (html: string): string => {
  const tmp = document.createElement('div')
  tmp.textContent = html // Use textContent to safely strip HTML
  return tmp.textContent || tmp.innerText || ''
}

export const sanitizeHTML = (html: string): string => {
  // Basic sanitization using textContent approach for security
  // In production, consider using DOMPurify library
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML || ''
}

export const extractTextFromHTML = (html: string): string => {
  const div = document.createElement('div')
  div.textContent = html // Safe approach to extract text
  return div.textContent || ''
}

export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

export const countCharacters = (text: string, includeSpaces: boolean = true): number => {
  return includeSpaces ? text.length : text.replace(/\s/g, '').length
}

export const estimateReadingTime = (text: string): number => {
  const wordsPerMinute = 200 // Average reading speed
  const words = countWords(text)
  return Math.ceil(words / wordsPerMinute)
}

export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// For editor styling utilities
export const toggleClass = (element: HTMLElement, className: string): void => {
  if (element.classList.contains(className)) {
    element.classList.remove(className)
  } else {
    element.classList.add(className)
  }
}