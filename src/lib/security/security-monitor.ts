/**
 * 安全监控模块
 * 提供安全事件监控、分析和告警功能
 */

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SecurityAnalysis {
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<string, number>;
  recentTrends: TrendData[];
  recommendations: string[];
  riskScore: number;
}

export interface TrendData {
  date: string;
  count: number;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventBuffer: SecurityEvent[] = [];
  private maxBufferSize: number = 10000;
  private alertThresholds = {
    critical: 0,    // 立即告警
    high: 1,        // 1个事件就告警
    medium: 5,      // 5个事件才告警
    low: 10         // 10个事件才告警
  };

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  private constructor() {
    // 定期清理旧事件
    this.startEventCleanup();
  }

  /**
   * 记录安全事件
   */
  static logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const monitor = SecurityMonitor.getInstance();
    const securityEvent: SecurityEvent = {
      ...event,
      id: SecurityMonitor.generateEventId(),
      timestamp: new Date()
    };

    monitor.eventBuffer.push(securityEvent);

    // 检查缓冲区大小
    if (monitor.eventBuffer.length > monitor.maxBufferSize) {
      monitor.eventBuffer = monitor.eventBuffer.slice(-monitor.maxBufferSize);
    }

    // 检查是否需要立即告警
    if (SecurityMonitor.shouldTriggerAlert(securityEvent)) {
      SecurityMonitor.sendAlert(securityEvent);
    }

    // 记录日志
    SecurityMonitor.logEvent(securityEvent);
  }

  /**
   * 生成唯一事件ID
   */
  private static generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 判断是否应该触发告警
   */
  private static shouldTriggerAlert(event: SecurityEvent): boolean {
    const monitor = SecurityMonitor.getInstance();
    const threshold = monitor.alertThresholds[event.severity];

    // 计算最近1小时内同类型事件数量
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = monitor.eventBuffer.filter(e =>
      e.type === event.type && e.timestamp >= oneHourAgo
    );

    return recentEvents.length >= threshold;
  }

  /**
   * 发送安全告警
   */
  private static sendAlert(event: SecurityEvent): void {
    const alertMessage = `🚨 SECURITY ALERT [${event.severity.toUpperCase()}]: ${event.description}`;

    console.error(alertMessage);

    // 这里可以集成外部通知服务
    SecurityMonitor.notifyExternalServices(event);
  }

  /**
   * 记录安全事件日志
   */
  private static logEvent(event: SecurityEvent): void {
    const logLevel = SecurityMonitor.getLogLevel(event.severity);
    const logMessage = `[SECURITY] ${event.type}: ${event.description}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, { eventId: event.id, severity: event.severity });
        break;
      case 'warn':
        console.warn(logMessage, { eventId: event.id, severity: event.severity });
        break;
      default:
        console.log(logMessage, { eventId: event.id, severity: event.severity });
    }
  }

  /**
   * 获取日志级别
   */
  private static getLogLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'log';
    }
  }

  /**
   * 通知外部服务
   */
  private static async notifyExternalServices(event: SecurityEvent): Promise<void> {
    // 这里可以集成外部通知服务
    // 例如：邮件、Slack、Webhook等

    try {
      // 示例：发送到监控系统
      if (event.severity === 'critical' || event.severity === 'high') {
        // await monitoringService.sendAlert(event);
      }
    } catch (error) {
      console.error('Failed to send external notification:', error);
    }
  }

  /**
   * 获取安全事件列表
   */
  static getSecurityEvents(filters?: {
    limit?: number;
    severity?: string;
    type?: string;
    since?: Date;
  }): SecurityEvent[] {
    const monitor = SecurityMonitor.getInstance();
    let events = [...monitor.eventBuffer];

    // 应用过滤器
    if (filters) {
      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }
      if (filters.type) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.since) {
        events = events.filter(e => e.timestamp >= filters.since!);
      }
      if (filters.limit) {
        events = events.slice(-filters.limit);
      }
    }

    return events.reverse(); // 最新的在前
  }

  /**
   * 分析安全趋势
   */
  static analyzeSecurityTrends(days: number = 7): SecurityAnalysis {
    const monitor = SecurityMonitor.getInstance();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = monitor.eventBuffer.filter(e => e.timestamp >= cutoffDate);

    const analysis: SecurityAnalysis = {
      totalEvents: events.length,
      eventsBySeverity: SecurityMonitor.groupBySeverity(events),
      eventsByType: SecurityMonitor.groupByType(events),
      recentTrends: SecurityMonitor.calculateTrends(events, days),
      recommendations: SecurityMonitor.generateRecommendations(events),
      riskScore: SecurityMonitor.calculateRiskScore(events)
    };

    return analysis;
  }

  /**
   * 按严重程度分组
   */
  private static groupBySeverity(events: SecurityEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 按类型分组
   */
  private static groupByType(events: SecurityEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 计算趋势数据
   */
  private static calculateTrends(events: SecurityEvent[], days: number): TrendData[] {
    const trends: TrendData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayEvents = events.filter(e =>
        e.timestamp.toISOString().split('T')[0] === dateStr
      );

      trends.push({
        date: dateStr,
        count: dayEvents.length
      });
    }

    return trends;
  }

  /**
   * 生成安全建议
   */
  private static generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    const severityCounts = SecurityMonitor.groupBySeverity(events);
    const typeCounts = SecurityMonitor.groupByType(events);

    // 基于严重程度的建议
    if (severityCounts.critical > 0) {
      recommendations.push('🚨 发现关键安全事件，建议立即进行全面安全评估');
    }

    if (severityCounts.high > 5) {
      recommendations.push('⚠️ 高风险事件频发，建议加强访问控制和监控');
    }

    // 基于事件类型的建议
    const failedLogins = typeCounts.failed_login || 0;
    if (failedLogins > 10) {
      recommendations.push('🔐 检测到异常登录尝试，建议实施IP限制和账户锁定策略');
    }

    const sqlInjectionAttempts = typeCounts.sql_injection_attempt || 0;
    if (sqlInjectionAttempts > 0) {
      recommendations.push('💉 检测到SQL注入尝试，建议立即检查输入验证和参数化查询');
    }

    const xssAttempts = typeCounts.xss_attempt || 0;
    if (xssAttempts > 0) {
      recommendations.push('🎯 检测到XSS尝试，建议加强输入清理和内容安全策略');
    }

    const bruteForceAttempts = typeCounts.brute_force_attempt || 0;
    if (bruteForceAttempts > 5) {
      recommendations.push('🔨 检测到暴力破解尝试，建议实施速率限制和CAPTCHA');
    }

    // 通用建议
    if (events.length > 100) {
      recommendations.push('📊 安全事件数量较多，建议定期审查安全日志');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 当前安全状况良好，继续保持现有安全措施');
    }

    return recommendations;
  }

  /**
   * 计算风险评分
   */
  private static calculateRiskScore(events: SecurityEvent[]): number {
    const severityWeights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };

    const totalScore = events.reduce((sum, event) => {
      return sum + severityWeights[event.severity];
    }, 0);

    // 归一化到0-100分
    const maxPossibleScore = 100 * 10; // 假设最多100个关键事件
    const normalizedScore = Math.min((totalScore / maxPossibleScore) * 100, 100);

    return Math.round(normalizedScore);
  }

  /**
   * 开始事件清理任务
   */
  private startEventCleanup(): void {
    // 每小时清理一次超过30天的事件
    setInterval(() => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const originalLength = this.eventBuffer.length;

      this.eventBuffer = this.eventBuffer.filter(event => event.timestamp >= thirtyDaysAgo);

      if (this.eventBuffer.length < originalLength) {
        console.log(`🧹 Cleaned up ${originalLength - this.eventBuffer.length} old security events`);
      }
    }, 60 * 60 * 1000); // 1小时
  }

  /**
   * 获取监控统计信息
   */
  static getMonitoringStats(): {
    totalEvents: number;
    bufferSize: number;
    maxBufferSize: number;
    uptime: number;
    recentAlerts: number;
  } {
    const monitor = SecurityMonitor.getInstance();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = monitor.eventBuffer.filter(e =>
      e.timestamp >= oneHourAgo &&
      (e.severity === 'critical' || e.severity === 'high')
    ).length;

    return {
      totalEvents: monitor.eventBuffer.length,
      bufferSize: monitor.eventBuffer.length,
      maxBufferSize: monitor.maxBufferSize,
      uptime: process.uptime(),
      recentAlerts
    };
  }

  /**
   * 导出安全数据
   */
  static exportSecurityData(format: 'json' | 'csv' = 'json'): string {
    const events = SecurityMonitor.getSecurityEvents({ limit: 1000 });

    if (format === 'csv') {
      const headers = ['id', 'type', 'severity', 'description', 'source', 'timestamp'];
      const csvRows = [headers.join(',')];

      events.forEach(event => {
        const row = [
          event.id,
          event.type,
          event.severity,
          `"${event.description.replace(/"/g, '""')}"`,
          event.source,
          event.timestamp.toISOString()
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    }

    return JSON.stringify(events, null, 2);
  }
}

// 常用安全事件类型常量
export const SecurityEventTypes = {
  FAILED_LOGIN: 'failed_login',
  SUCCESSFUL_LOGIN: 'successful_login',
  PASSWORD_CHANGE: 'password_change',
  ACCOUNT_LOCKED: 'account_locked',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_ATTEMPT: 'csrf_attempt',
  BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_BREACH: 'data_breach',
  MALICIOUS_REQUEST: 'malicious_request',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_API_KEY: 'invalid_api_key',
  SECURITY_POLICY_VIOLATION: 'security_policy_violation'
} as const;