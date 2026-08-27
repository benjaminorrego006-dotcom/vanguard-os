export async function render() {
  return `
    <div style="padding: 20px 0 20px 20px; font-family: 'Inter', sans-serif;">
      <!-- Header -->
      <div class="flex-between" style="padding-right: 20px; margin-bottom: 24px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="15" y2="18"></line></svg>
        <h1 style="font-size: 20px; font-weight: 500; margin: 0;">TaskFlow</h1>
        <div class="avatar-circle" style="background: #475569; color: #fff;">A</div>
      </div>

      <!-- Search -->
      <div class="search-bar" style="margin-right: 20px; background: var(--surface-1);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Buscar tareas, proyectos...</span>
      </div>

      <!-- Kanban Board -->
      <div style="display: flex; gap: 16px; overflow-x: auto; padding-right: 20px; padding-bottom: 100px;">
        
        <!-- Por Hacer -->
        <div style="min-width: 200px;">
          <div class="flex-between" style="margin-bottom: 16px;">
            <h3 style="font-size: 15px; font-weight: 500;">Por Hacer</h3>
            <span style="color: var(--text-disabled);">?</span>
          </div>
          
          <div class="card tappable" style="padding: 16px; position: relative; overflow: hidden; margin-bottom: 12px; background: #1c1c1e;">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--accent-orange);"></div>
            <h4 style="font-size: 15px; font-weight: 500; margin-bottom: 12px; margin-top: 0;">Finalizar Estrategia de Marketing</h4>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Prioridad: <span style="background: rgba(239,68,68,0.2); color: #fca5a5; padding: 2px 6px; border-radius: 4px;">alta</span></div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Vence: 28 Oct</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Product Launch</div>
            <div class="flex-between">
              <div class="avatar-circle" style="width:20px; height:20px; font-size:10px; background: #3b82f6;">B</div>
              <div style="font-size: 12px; color: var(--text-secondary); display:flex; align-items:center; gap:4px;">?? 2/5</div>
            </div>
          </div>
          
          <div class="card tappable" style="padding: 16px; position: relative; overflow: hidden; margin-bottom: 12px; background: #1c1c1e;">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--accent-orange);"></div>
            <h4 style="font-size: 15px; font-weight: 500; margin-bottom: 12px; margin-top: 0;">Diseñar Wireframes de la App</h4>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Prioridad: <span style="background: rgba(239,68,68,0.2); color: #fca5a5; padding: 2px 6px; border-radius: 4px;">alta</span></div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Vence: 30 Oct</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Product Launch</div>
            <div class="flex-between">
              <div class="avatar-circle" style="width:20px; height:20px; font-size:10px; background: #3b82f6;">B</div>
              <div style="font-size: 12px; color: var(--text-secondary); display:flex; align-items:center; gap:4px;">?? 2/5</div>
            </div>
          </div>
        </div>

        <!-- En Progreso -->
        <div style="min-width: 200px;">
          <div class="flex-between" style="margin-bottom: 16px;">
            <h3 style="font-size: 15px; font-weight: 500;">En Progreso</h3>
            <span style="color: var(--text-disabled);">?</span>
          </div>
          
          <div class="card tappable" style="padding: 16px; position: relative; overflow: hidden; margin-bottom: 12px; background: #1c1c1e;">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #fb923c;"></div>
            <h4 style="font-size: 15px; font-weight: 500; margin-bottom: 12px; margin-top: 0;">Desarrollar Módulo de Autenticación</h4>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Prioridad: <span style="background: rgba(249,115,22,0.2); color: #fb923c; padding: 2px 6px; border-radius: 4px;">media</span></div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Vence: 30 Oct</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Product Launch</div>
            <div class="flex-between">
              <div class="avatar-circle" style="width:20px; height:20px; font-size:10px; background: #3b82f6;">B</div>
            </div>
          </div>
          
          <div class="card tappable" style="padding: 16px; position: relative; overflow: hidden; margin-bottom: 12px; background: #1c1c1e;">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #86efac;"></div>
            <h4 style="font-size: 15px; font-weight: 500; margin-bottom: 12px; margin-top: 0;">Revisar Feedback de UI</h4>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Prioridad: <span style="background: rgba(34,197,94,0.2); color: #86efac; padding: 2px 6px; border-radius: 4px;">baja</span></div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Vence: 29 Oct</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Product Launch</div>
            <div class="flex-between">
              <div class="avatar-circle" style="width:20px; height:20px; font-size:10px; background: #3b82f6;">B</div>
            </div>
          </div>
        </div>

        <!-- DONE -->
        <div style="min-width: 200px;">
          <div class="flex-between" style="margin-bottom: 16px;">
            <h3 style="font-size: 15px; font-weight: 500;">Completado</h3>
          </div>
          
          <div class="card tappable" style="padding: 16px; position: relative; overflow: hidden; margin-bottom: 12px; background: #1c1c1e;">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--accent-orange);"></div>
            <h4 style="font-size: 15px; font-weight: 500; margin-bottom: 12px; margin-top: 0; text-decoration: line-through; color: var(--text-disabled);">Notas de Cliente</h4>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Completado</div>
            <div class="flex-between">
              <div class="avatar-circle" style="width:20px; height:20px; font-size:10px; background: #ec4899;">V</div>
            </div>
          </div>
        </div>

      </div>

      <!-- FAB (Floating Action Button) from Image 1 -->
      <div style="position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%); z-index: 2000;">
        <button class="tappable" style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent-orange); color: #000; font-size: 30px; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">+</button>
      </div>
    </div>
  `;
}
