/**
 * Otimização de Performance - Sistema de Nichos
 * Implementa melhorias de performance e boas práticas
 */

// ============================================
// CACHE DE DADOS
// ============================================

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxAge = 5 * 60 * 1000; // 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Limpar a cada minuto
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.cache.has(key) && this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new CacheManager();

// ============================================
// DEBOUNCING E THROTTLING
// ============================================

class PerformanceUtils {
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static async retry(func, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await func();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
}

// ============================================
// OTIMIZAÇÃO DE REQUISIÇÕES
// ============================================

class OptimizedSupabase {
  constructor() {
    this.batchQueue = new Map();
    this.batchTimeout = null;
  }

  async buscarNichosDoUsuarioOtimizado() {
    const cacheKey = 'nichos_usuario';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const nichos = await PerformanceUtils.retry(async () => {
        return await WikiSupabase.buscarNichosDoUsuario();
      }, 3, 1000);

      cache.set(cacheKey, nichos);
      return nichos;
    } catch (error) {
      console.error('Erro ao buscar nichos:', error);
      throw error;
    }
  }

  async buscarCategoriasPorNichoOtimizado(nichoId) {
    const cacheKey = `categorias_nicho_${nichoId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const categorias = await PerformanceUtils.retry(async () => {
        return await WikiSupabase.buscarCategoriasPorNicho(nichoId);
      }, 3, 1000);

      cache.set(cacheKey, categorias);
      return categorias;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  async buscarEntradasPorNichoOtimizado(nichoId, termoBusca = '') {
    const cacheKey = `entradas_nicho_${nichoId}_${termoBusca}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const entradas = await PerformanceUtils.retry(async () => {
        return await WikiSupabase.buscarEntradasPorNicho(nichoId, termoBusca);
      }, 3, 1000);

      cache.set(cacheKey, entradas);
      return entradas;
    } catch (error) {
      console.error('Erro ao buscar entradas:', error);
      throw error;
    }
  }

  async validarAcessoNichoOtimizado(nichoId) {
    const cacheKey = `acesso_nicho_${nichoId}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;

    try {
      const temAcesso = await PerformanceUtils.retry(async () => {
        return await WikiSupabase.validarAcessoNicho(nichoId);
      }, 3, 1000);

      cache.set(cacheKey, temAcesso);
      return temAcesso;
    } catch (error) {
      console.error('Erro ao validar acesso:', error);
      throw error;
    }
  }

  limparCache() {
    cache.clear();
  }
}

const optimizedSupabase = new OptimizedSupabase();

// ============================================
// OTIMIZAÇÃO DE INTERFACES
// ============================================

class UIOptimizer {
  static lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  static optimizeRendering(container, items, renderItem) {
    const fragment = document.createDocumentFragment();
    const batchSize = 20;
    let index = 0;

    function appendItems() {
      const batch = items.slice(index, index + batchSize);
      batch.forEach(item => {
        const element = renderItem(item);
        fragment.appendChild(element);
      });

      index += batchSize;

      if (index < items.length) {
        container.appendChild(fragment);
        requestAnimationFrame(appendItems);
      } else {
        container.appendChild(fragment);
      }
    }

    appendItems();
  }

  static virtualizeList(container, items, itemHeight, renderItem) {
    const viewportHeight = container.clientHeight;
    const totalItems = items.length;
    const visibleItems = Math.ceil(viewportHeight / itemHeight) + 2;
    const totalHeight = totalItems * itemHeight;

    const virtualContainer = document.createElement('div');
    virtualContainer.style.height = `${totalHeight}px`;
    virtualContainer.style.position = 'relative';

    const visibleContainer = document.createElement('div');
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.left = '0';
    visibleContainer.style.width = '100%';

    virtualContainer.appendChild(visibleContainer);
    container.appendChild(virtualContainer);

    function updateVisibleItems() {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleItems, totalItems);

      visibleContainer.innerHTML = '';

      for (let i = startIndex; i < endIndex; i++) {
        const item = items[i];
        const element = renderItem(item);
        element.style.position = 'absolute';
        element.style.top = `${i * itemHeight}px`;
        element.style.height = `${itemHeight}px`;
        element.style.width = '100%';
        visibleContainer.appendChild(element);
      }
    }

    container.addEventListener('scroll', PerformanceUtils.throttle(updateVisibleItems, 16));
    updateVisibleItems();
  }
}

// ============================================
// MONITORAMENTO DE PERFORMANCE
// ============================================

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
  }

  startTimer(name) {
    this.metrics[name] = {
      start: performance.now(),
      end: null,
      duration: null
    };
  }

  endTimer(name) {
    if (this.metrics[name]) {
      this.metrics[name].end = performance.now();
      this.metrics[name].duration = this.metrics[name].end - this.metrics[name].start;
    }
  }

  getMetric(name) {
    return this.metrics[name];
  }

  getAllMetrics() {
    return this.metrics;
  }

  logMetrics() {
    console.group('📊 Métricas de Performance');
    Object.entries(this.metrics).forEach(([name, metric]) => {
      console.log(`${name}: ${metric.duration?.toFixed(2)}ms`);
    });
    console.groupEnd();
  }

  observePerformance() {
    // Observer para carregamento de recursos
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            console.log(`📦 Recurso carregado: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }

    // Observer para paint
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint') {
            console.log(`🎨 ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    }
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = {};
  }
}

const performanceMonitor = new PerformanceMonitor();

// ============================================
// INTEGRAÇÃO COM SUPABASE CLIENT
// ============================================

// Substituir funções do Supabase Client por versões otimizadas
if (typeof WikiSupabase !== 'undefined') {
  const originalBuscarNichos = WikiSupabase.buscarNichosDoUsuario;
  const originalBuscarCategorias = WikiSupabase.buscarCategoriasPorNicho;
  const originalBuscarEntradas = WikiSupabase.buscarEntradasPorNicho;
  const originalValidarAcesso = WikiSupabase.validarAcessoNicho;

  WikiSupabase.buscarNichosDoUsuario = function() {
    performanceMonitor.startTimer('buscarNichos');
    return originalBuscarNichos.apply(this, arguments).finally(() => {
      performanceMonitor.endTimer('buscarNichos');
    });
  };

  WikiSupabase.buscarCategoriasPorNicho = function(nichoId) {
    performanceMonitor.startTimer(`buscarCategorias_${nichoId}`);
    return originalBuscarCategorias.apply(this, arguments).finally(() => {
      performanceMonitor.endTimer(`buscarCategorias_${nichoId}`);
    });
  };

  WikiSupabase.buscarEntradasPorNicho = function(nichoId, termoBusca) {
    performanceMonitor.startTimer(`buscarEntradas_${nichoId}_${termoBusca || 'all'}`);
    return originalBuscarEntradas.apply(this, arguments).finally(() => {
      performanceMonitor.endTimer(`buscarEntradas_${nichoId}_${termoBusca || 'all'}`);
    });
  };

  WikiSupabase.validarAcessoNicho = function(nichoId) {
    performanceMonitor.startTimer(`validarAcesso_${nichoId}`);
    return originalValidarAcesso.apply(this, arguments).finally(() => {
      performanceMonitor.endTimer(`validarAcesso_${nichoId}`);
    });
  };
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Iniciar monitoramento de performance
  performanceMonitor.observePerformance();

  // Otimizar imagens
  UIOptimizer.lazyLoadImages();

  // Limpar cache periodicamente
  setInterval(() => {
    optimizedSupabase.limparCache();
    console.log('🧹 Cache limpo');
  }, 10 * 60 * 1000); // A cada 10 minutos

  // Logar métricas ao descarregar a página
  window.addEventListener('beforeunload', () => {
    performanceMonitor.logMetrics();
  });
});

// ============================================
// EXPORTS
// ============================================

window.PerformanceUtils = PerformanceUtils;
window.OptimizedSupabase = OptimizedSupabase;
window.UIOptimizer = UIOptimizer;
window.PerformanceMonitor = PerformanceMonitor;
window.cache = cache;
window.optimizedSupabase = optimizedSupabase;
window.performanceMonitor = performanceMonitor;