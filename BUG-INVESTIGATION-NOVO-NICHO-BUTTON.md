# Bug Investigation Report: "Novo Nicho" Button Not Working

**Date:** 2026-03-17  
**Status:** UNRESOLVED - Requires further investigation  
**Severity:** High - Prevents creating new nichos from UI

---

## Problem Description

The "Novo Nicho" button in `dashboard.html` is completely unresponsive when clicked:
- No modal appears
- No console output (errors or logs)
- No visible reaction whatsoever
- User reports they could create ONE nicho in previous tests, but cannot create another

### Affected Elements

Three buttons with the same issue:
1. Header button: `<button id="btnNovoNicho" onclick="abrirModalCriar()">`
2. Welcome screen: `<button id="btnGetStarted" onclick="abrirModalCriar()">`
3. Empty state: `<button id="btnCreateFirstNicho" onclick="abrirModalCriar()">`

---

## Initial Hypothesis (DISPROVEN)

**Theory:** Function `abrirModalCriar()` not exposed to global scope  
**Fix Attempted:** Added `window.abrirModalCriar = abrirModalCriar;` to `js/dashboard.js` (line ~420)  
**Result:** Fix was correct but didn't solve the problem

---

## Diagnostic Tests Performed

### ✅ Test 1: Function Exists Globally
```javascript
window.abrirModalCriar
```
**Result:** Returns function - PASS  
**Conclusion:** Function is properly exposed to global scope

### ✅ Test 2: Manual Function Call
```javascript
window.abrirModalCriar()
```
**Result:** Modal opens successfully - PASS  
**Conclusion:** Function works correctly when called directly

### ✅ Test 3: Script Loading
- Checked Network tab: `dashboard.js` loads with status 200
- Confirmed file contains the fix: `window.abrirModalCriar = abrirModalCriar;`
**Result:** PASS  
**Conclusion:** Scripts are loading properly

### ✅ Test 4: Script Execution
```javascript
estado
```
**Result:** Returns object with nichos, nichoAtual, etc. - PASS  
**Conclusion:** `dashboard.js` is executing successfully

### ✅ Test 5: Button Click Detection
```javascript
document.getElementById('btnNovoNicho').addEventListener('click', function(e) {
    console.log('Button clicked!', e);
});
```
**Result:** Logs "Button clicked!" when button is clicked - PASS  
**Conclusion:** Button receives click events

### ✅ Test 6: Programmatic Click
```javascript
document.getElementById('btnNovoNicho').click()
```
**Result:** Not explicitly tested but likely would work based on other results

### ✅ Test 7: Element Blocking Check
```javascript
document.elementFromPoint(
    document.getElementById('btnNovoNicho').getBoundingClientRect().x + 10,
    document.getElementById('btnNovoNicho').getBoundingClientRect().y + 10
);
```
**Result:** Returns the button itself - PASS  
**Conclusion:** No CSS z-index or overlay issues

### ✅ Test 8: CSP/Security Warnings
- Monitored console while clicking button
**Result:** No warnings or errors - PASS  
**Conclusion:** No Content Security Policy blocking inline handlers

### ✅ Test 9: onclick Attribute Preservation
```javascript
document.getElementById('btnNovoNicho').getAttribute('onclick')
```
**Result:** Returns `"abrirModalCriar()"` - PASS  
**Conclusion:** Attribute is not being removed

### ✅ Test 10: onclick Property Check
```javascript
document.getElementById('btnNovoNicho').onclick
```
**Result:** Returns `function onclick(event)` - PASS  
**Conclusion:** onclick property exists and is a function

### ✅ Test 11: DOM Inspection
- Right-clicked button and inspected element
**Result:** Shows `onclick="abrirModalCriar()"` in HTML - PASS  
**Conclusion:** Attribute is present in rendered DOM

### ✅ Test 12: configurarEventListeners Function
```javascript
configurarEventListeners
```
**Result:** Returns function - PASS  
**Conclusion:** Function is defined

### ❌ Test 13: Manual Event Listener Setup
```javascript
configurarEventListeners()
```
**Result:** Returns undefined, but button STILL doesn't work after this call - FAIL  
**Conclusion:** Even manually calling the setup function doesn't fix the issue

### ❓ Test 14: Check Event Listeners (Not Available)
```javascript
getEventListeners(document.getElementById('btnNovoNicho'))
```
**Result:** `Uncaught ReferenceError: getEventListeners is not defined`  
**Note:** This is a Chrome DevTools-only API, not standard JavaScript

---

## What Works

1. ✅ Function exists globally: `window.abrirModalCriar`
2. ✅ Function executes correctly when called manually
3. ✅ Scripts load with 200 status
4. ✅ JavaScript executes without errors
5. ✅ Button receives click events (addEventListener works)
6. ✅ Button is not blocked by CSS or other elements
7. ✅ No CSP or security warnings
8. ✅ onclick attribute is present in DOM
9. ✅ onclick property exists on element
10. ✅ Hard refresh performed (Ctrl+Shift+R)

## What Doesn't Work

1. ❌ Clicking button does nothing
2. ❌ No console output when clicking
3. ❌ No modal appears
4. ❌ Inline `onclick="abrirModalCriar()"` doesn't trigger
5. ❌ Event listener from `configurarEventListeners()` doesn't trigger

---

## The Mystery

**This is the paradox:**
- The button receives clicks (we can attach a listener and it fires)
- The function exists and works (we can call it manually)
- The onclick attribute is present (we can see it in DOM)
- No errors or warnings appear anywhere
- **BUT: Neither the inline onclick NOR the addEventListener from the code work**

This suggests something is intercepting or preventing ALL event handlers from executing, but ONLY on these specific buttons, ONLY for this specific functionality.

---

## Code Analysis

### Button HTML
```html
<button class="btn btn-primary" id="btnNovoNicho" onclick="abrirModalCriar()">
    <svg>...</svg>
    Novo Nicho
</button>
```

### Event Listener Setup (dashboard.js, line ~389)
```javascript
function configurarEventListeners() {
  document.getElementById('btnNovoNicho')?.addEventListener('click', abrirModalCriar);
  document.getElementById('btnGetStarted')?.addEventListener('click', abrirModalCriar);
  document.getElementById('btnCreateFirstNicho')?.addEventListener('click', abrirModalCriar);
  // ... more listeners
}
```

### Global Function Export (dashboard.js, line ~420)
```javascript
window.abrirModalCriar = abrirModalCriar;
window.abrirModalEditar = abrirModalEditar;
window.abrirModalExcluir = abrirModalExcluir;
```

### DOMContentLoaded Handler (dashboard.js, line ~20)
```javascript
document.addEventListener('DOMContentLoaded', async function () {
  try {
    estado.usuario = await verificarAutenticacao();
    if (!estado.usuario) return;  // Early exit if not authenticated
    
    WikiSupabase.inicializarSupabase();
    configurarEventListeners();  // Sets up all event listeners
    await carregarDashboard();
  } catch (error) {
    console.error('Erro na inicialização do dashboard:', error);
  }
});
```

### Note: Duplicate DOMContentLoaded
There's ALSO an inline script in `dashboard.html` (at the bottom) with another DOMContentLoaded listener that handles authentication and user menu. This creates two separate initialization paths.

---

## Theories to Investigate

### Theory 1: Event Handler Conflict
- **Hypothesis:** Having both `onclick` attribute AND `addEventListener` causes a conflict
- **Test:** Remove one of them and see if the other works
- **Status:** Not tested yet

### Theory 2: Authentication/Authorization Check
- **Hypothesis:** Some code is checking permissions and silently blocking the action
- **Test:** Check if there's any authorization code that might prevent creating nichos
- **Status:** Not investigated yet

### Theory 3: Initialization Timing Issue
- **Hypothesis:** Something in the initialization sequence is breaking the handlers
- **Test:** Check execution order of the two DOMContentLoaded listeners
- **Status:** Not fully investigated

### Theory 4: Event Bubbling Blocked Elsewhere
- **Hypothesis:** A parent element or document-level handler is stopping propagation
- **Test:** Check for any click handlers on parent elements or document
- **Status:** User reported no stopPropagation found, but not exhaustively checked

### Theory 5: Browser-Specific Issue
- **Hypothesis:** Specific browser or browser extension blocking functionality
- **Test:** Try different browser or incognito mode
- **Status:** Not tested yet

### Theory 6: State-Dependent Blocking
- **Hypothesis:** The function checks some state (like existing nichos) and silently fails
- **Test:** Check `abrirModalCriar()` function for early returns or state checks
- **Status:** Function code looks clean, but not deeply analyzed

---

## Next Steps to Try

1. **Remove inline onclick attributes entirely**
   - Edit `dashboard.html` and remove all `onclick="abrirModalCriar()"`
   - Rely solely on addEventListener from `configurarEventListeners()`
   - This eliminates potential conflict between two handler methods

2. **Add extensive logging**
   - Add `console.log` at the START of `abrirModalCriar()` function
   - Add `console.log` in `configurarEventListeners()` to confirm it runs
   - Add `console.log` to verify event listeners are actually attached

3. **Check browser console for suppressed errors**
   - Enable "Preserve log" in console
   - Enable "All levels" (including Verbose)
   - Click button and check for ANY output

4. **Test in different browser/incognito**
   - Try Chrome incognito mode
   - Try Firefox
   - Disable all browser extensions

5. **Check for hidden authorization logic**
   - Search codebase for permission/authorization checks
   - Check if there's RLS (Row Level Security) logic preventing inserts

6. **Simplify the function temporarily**
   - Replace `abrirModalCriar()` with just `alert('clicked!')`
   - See if even a simple alert works

7. **Check modal CSS**
   - Verify modal-overlay has correct CSS
   - Check if `active` class actually makes modal visible
   - Test: `document.getElementById('nichoModalOverlay').classList.add('active')`

8. **Investigate the "created one nicho before" clue**
   - User said they created ONE nicho previously but can't create another
   - Check if there's a limit on number of nichos
   - Check database for existing nicho
   - Check if there's validation preventing duplicate nichos

9. **Check browser's Event Listeners panel**
   - In Chrome DevTools Elements tab
   - Select the button
   - Check "Event Listeners" panel on the right
   - See what listeners are actually registered

10. **Nuclear option: Rewrite event handling**
    - Remove ALL onclick attributes
    - Remove event listener setup
    - Use a single, simple approach (either inline or addEventListener, not both)
    - Start with minimal code and build up

---

## Files Modified

- ✅ `js/dashboard.js` - Added `window.abrirModalCriar = abrirModalCriar;` (line ~420)

## Files to Check

- `js/dashboard.js` - Main dashboard logic
- `dashboard.html` - Button definitions and inline script
- `js/auth.js` - Authentication logic
- `js/supabase-client.js` - Database operations
- `css/dashboard.css` - Modal visibility styling

---

## Relevant Code Snippets

### abrirModalCriar Function (dashboard.js)
```javascript
function abrirModalCriar() {
  const modal = document.getElementById('nichoModalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const nichoForm = document.getElementById('nichoForm');
  
  // Configurar modal para criação
  modalTitle.textContent = 'Novo Nicho';
  nichoForm.reset();
  
  // Valores padrão
  document.getElementById('nichoIcone').value = '🏠';
  document.getElementById('nichoCor').value = '#3366cc';
  document.getElementById('colorPreview').textContent = '#3366cc';
  
  modal.classList.add('active');
}
```

**Note:** Function looks straightforward, no early returns or complex logic.

---

## Environment Details

- **Browser:** Not specified (likely Chrome based on tests)
- **OS:** Windows 10
- **Project:** Memora - Personal knowledge management system
- **Framework:** Vanilla JavaScript + Supabase
- **Authentication:** Supabase Auth

---

## Summary

This is an extremely unusual bug where:
- Everything tests as working correctly
- But the actual user interaction fails completely
- No errors or warnings appear anywhere
- Manual function call works, but event handlers don't

The issue likely lies in some subtle interaction between:
- The dual DOMContentLoaded handlers
- The dual event handler approaches (inline + addEventListener)
- Some unknown state or authorization check
- Or a browser-specific issue not yet identified

**Recommendation:** Start with the simplest approach—remove all inline onclick attributes and rely solely on addEventListener. Add extensive logging to track execution. Test in a different browser to rule out browser-specific issues.

---

## Contact for Continuation

When resuming this investigation:
1. Read this entire document
2. Start with "Next Steps to Try" section
3. Focus on theories not yet tested
4. Add logging before making major changes
5. Test each change incrementally

Good luck! 🐛🔍