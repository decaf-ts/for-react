/**
 * @description Portuguese translation resources.
 * @summary Portuguese message tree for validation errors, CRUD operations and
 * common component labels, consumed by the i18n loader.
 * @memberOf module:for-react
 */
export const pt: Record<string, unknown> = {
  "errors": {
    "required": "Este campo é obrigatório.",
    "pattern": "O valor fornecido não corresponde ao padrão.",
    "min": "O valor mínimo para este campo é {0}.",
    "max": "O valor máximo para este campo é {0}.",
    "minlength": "O comprimento mínimo para este campo é {0}.",
    "maxlength": "O comprimento máximo para este campo é {0}.",
    "equal": "Este campo deve ser igual a {0}",
    "default": "Este valor parece ser inválido.",
    "unique": "O campo {0} deve ser único",
    "password": "A palavra-passe deve ter pelo menos 8 caracteres e conter um número, letras maiúsculas e minúsculas, e um carácter especial (@$!%*?&_-.,)",
    "email": "Este campo deve conter um endereço de e-mail válido.",
    "url": "Este campo deve conter um URL válido.",
    "number": "Este campo deve conter um número válido.",
    "integer": "Este campo deve conter um número inteiro válido.",
    "digits": "Este campo deve conter apenas dígitos.",
    "alphanum": "Este campo deve ser alfanumérico.",
    "file": "Apenas {0} ficheiros são permitidos",
    "equals": "Este campo deve ser igual ao campo {0}",
    "different": "Este campo deve ser diferente do campo {0}",
    "lessThan": "Este campo deve ser inferior ao campo {0}",
    "lessThanOrEqual": "Este campo deve ser inferior ou igual ao campo {0}",
    "greaterThan": "Este campo deve ser superior ao campo {0}",
    "greaterThanOrEqual": "Este campo deve ser superior ou igual ao campo {0}",
    "form_control": "Controlador de formulário não localizado para {0}.",
    "not_found": "Não foram encontrados registos com <span class=\"text-bold\">{0}: {1} em {2}</span>.",
    "empty_options": "Sem opções disponíveis para o campo {0}. Corrija a fonte de dados."
  },
  "operations": {
    "read": {
      "success": "Item {0} {1} encontrado.",
      "error": "Item {0} {1} não encontrado."
    },
    "create": {
      "success": "Item com {0} {1} criado com sucesso.",
      "error": "Erro ao criar o item com {0} {1}."
    },
    "update": {
      "success": "Item com {0} {1} atualizado com sucesso.",
      "error": "Erro ao atualizar o item com {0} {1}."
    },
    "delete": {
      "success": "Item com {0} {1} eliminado com sucesso.",
      "error": "Erro ao eliminar o item com {0} {1}."
    }
  },
  "cron_selector": {
    "title": "Seletor de cron",
    "current_cron": "Cron atual:"
  },
  "date": {
    "weekdays": {
      "sunday": "Domingo",
      "monday": "Segunda-feira",
      "tuesday": "Terça-feira",
      "wednesday": "Quarta-feira",
      "thursday": "Quinta-feira",
      "friday": "Sexta-feira",
      "saturday": "Sábado"
    },
    "months": {
      "january": "Janeiro",
      "february": "Fevereiro",
      "march": "Março",
      "april": "Abril",
      "may": "Maio",
      "june": "Junho",
      "july": "Julho",
      "august": "Agosto",
      "september": "Setembro",
      "october": "Outubro",
      "november": "Novembro",
      "december": "Dezembro"
    }
  },
  "dashboard-builder": {
    "title": "Construtor de Dashboard",
    "create": "Criar",
    "read": "Ler",
    "update": "Actualizar",
    "delete": "Apagar",
    "saved": "Dashboard guardado."
  },
  "dashboard": {
    "demo": {
      "stats": "Estatística",
      "list": "Lista",
      "note": "Nota"
    }
  },
  "calendar": {
    "title": "Calendário",
    "label": "Calendário",
    "previous_month": "Mês anterior",
    "next_month": "Mês seguinte",
    "today": "Hoje",
    "day_with_events": "{0}: {1}",
    "event": {
      "site_visit": "Visita ao local",
      "inspection": "Inspeção de segurança",
      "delivery": "Entrega de material",
      "training": "Formação de segurança",
      "audit": "Auditoria de qualidade",
      "handover": "Entrega da obra"
    }
  },
  "kanban": {
    "title": "Kanban",
    "intro": "Um quadro Kanban controlado, portado da entrada Angular. As tarefas, colunas, limites de trabalho em curso e estado pertencem ao host; o quadro apenas os apresenta e emite movimentos, reordenações e seleções pedidas.",
    "demo_label": "Controlos da demonstração Kanban",
    "label": "Quadro da sprint",
    "add_card": "Adicionar cartão",
    "reset": "Reiniciar",
    "clear": "Limpar tarefas",
    "read_only": "Apenas leitura",
    "disabled": "Desativado",
    "loading": "A carregar",
    "error": "Erro",
    "filter": "Apenas Ada",
    "no_event": "Ainda sem eventos do quadro.",
    "empty": "Sem tarefas",
    "loading_message": "A carregar tarefas...",
    "error_message": "Não foi possível carregar as tarefas.",
    "retry": "Tentar novamente",
    "keyboard_help": "Prima Espaço para levantar um cartão, use as setas para o mover, prima Enter para selecionar ou largar, prima Enter novamente para editar, prima E para editar e Escape para cancelar ou limpar a seleção.",
    "columns": {
      "todo": "A fazer",
      "doing": "Em curso",
      "review": "Revisão",
      "done": "Concluído"
    }
  },
  "scrum": {
    "title": "Scrum",
    "intro": "Vistas de backlog e sprint compostas a partir do quadro Kanban. As tarefas, sprints, seleção e atribuição pertencem ao host; os componentes apenas apresentam e emitem pedidos tipados.",
    "demo_label": "Controlos da demonstração Scrum",
    "reset": "Reiniciar",
    "search": "Pesquisar",
    "search_placeholder": "Filtrar tarefas",
    "read_only": "Apenas leitura",
    "loading": "A carregar",
    "error": "Erro",
    "no_event": "Ainda sem eventos de Scrum.",
    "sprint_selection": "Seleção de sprint",
    "sprint_label": "Sprint",
    "sprint_placeholder": "Selecionar uma sprint",
    "backlog": "Backlog",
    "backlog_tasks": "Tarefas do backlog",
    "sprint_board": "Quadro da sprint",
    "sprint_board_tasks": "Tarefas do quadro da sprint",
    "select_sprint_hint": "Selecione uma sprint para abrir o respetivo quadro.",
    "assign_to_sprint": "Atribuir à sprint",
    "assign_placeholder": "Selecionar uma sprint",
    "empty_backlog": "Sem tarefas no backlog",
    "loading_backlog": "A carregar o backlog...",
    "error_backlog": "Não foi possível carregar o backlog.",
    "empty_sprint": "Sem tarefas nesta sprint",
    "loading_sprint": "A carregar a sprint...",
    "error_sprint": "Não foi possível carregar a sprint.",
    "retry": "Tentar novamente",
    "error_message": "Não foi possível carregar a sprint. Tente novamente.",
    "sprints": {
      "sprint_1": "Sprint 1 — Agora",
      "sprint_2": "Sprint 2 — A seguir",
      "sprint_3": "Sprint 3 — Mais tarde"
    },
    "tasks": {
      "t1": "Refinar regras de ordenação do backlog",
      "t2": "Documentar contrato de âmbito da sprint",
      "t3": "Triar feedback de atribuição à sprint",
      "t4": "Alinhar predicados de filtro com a pesquisa",
      "t5": "Compor quadro da sprint a partir do Kanban",
      "t6": "Reutilizar mecânicas de arrastar/largar do Kanban",
      "t7": "Fluxo de teclado do seletor de sprint",
      "t8": "Eventos tipados de atribuição à sprint",
      "t9": "Spike de seguimento de velocidade",
      "t10": "Sessão de preparação do backlog"
    },
    "columns": {
      "todo": "A fazer",
      "doing": "Em curso",
      "review": "Revisão",
      "done": "Concluído"
    }
  },

  "storyboard": {
    "title": "Tutorial storyboard",
    "intro": "Inicie o fluxo guiado. O tutorial escurece a página, destaca o alvo do passo atual e mantém-se sincronizado com os controlos do tutorial.",
    "start": "Iniciar tutorial",
    "next": "Passo seguinte",
    "previous": "Passo anterior",
    "abort": "Abortar",
    "end": "Terminar tutorial",
    "close": "Fechar tutorial",
    "scenario_label": "Cenário do tutorial",
    "scenario_feature_tour": "Tour da página de funcionalidades",
    "scenario_placements": "Valores de colocação",
    "scenario_timeout": "Conclusão por tempo",
    "scenario_click": "Conclusão por clique",
    "scenario_input": "Conclusão por entrada",
    "scenario_keys": "Conclusão por teclado",
    "scenario_labels": "Etiquetas e painel personalizados",
    "status_label": "Estado",
    "status_idle": "Inativo",
    "status_running": "Em curso",
    "status_completed": "Concluído",
    "status_aborted": "Abortado",
    "step_label": "Passo ativo",
    "step_none": "Nenhum passo ativo.",
    "event_label": "Último evento",
    "event_none": "Ainda não há eventos do tutorial.",
    "event_started": "Tutorial iniciado: {id}",
    "event_stepped": "Agora no passo: {step}",
    "event_finished": "Tutorial terminado: {status}",
    "scenario_name": "Tour da página de funcionalidades",
    "welcome_title": "Bem-vindo à página de funcionalidades",
    "welcome_content": "Este tour é conduzido pelo motor de tutorial storyboard. Siga o controlo destacado e avance com o passo seguinte.",
    "name_title": "Introduza o seu nome",
    "name_content": "O campo destacado é o foco deste passo. Preencha-o e continue com o passo seguinte.",
    "confirm_title": "Confirme o valor",
    "confirm_content": "Clique no botão de confirmação destacado e continue com o passo seguinte.",
    "finish_title": "Tour concluído",
    "finish_content": "Experimentou o tutorial programado, a sua sobreposição de foco e as suas regras de conclusão.",
    "demo_title": "Área de experimentação do tutorial",
    "demo_intro": "Este formulário é o alvo do tour. Os valores permanecem na página depois de o tour terminar.",
    "name_label": "O seu nome",
    "name_placeholder": "Pelo menos três caracteres",
    "notes_label": "Notas de lançamento",
    "notes_placeholder": "Escreva aqui as próximas notas de lançamento",
    "confirm": "Confirmar",
    "confirmed": "Valor confirmado: {value}",
    "placements_name": "Valores de colocação",
    "placement_top_title": "Colocação superior",
    "placement_top_content": "O balão de instrução está ancorado acima da área de experimentação.",
    "placement_bottom_title": "Colocação inferior",
    "placement_bottom_content": "O balão de instrução está ancorado abaixo do campo de nome.",
    "placement_left_title": "Colocação à esquerda",
    "placement_left_content": "O balão de instrução está ancorado à esquerda do botão de confirmação.",
    "placement_right_title": "Colocação à direita",
    "placement_right_content": "O balão de instrução está ancorado à direita da área de notas.",
    "placement_center_title": "Colocação central",
    "placement_center_content": "O balão de instrução está centrado sobre o tutorial.",
    "timeout_name": "Conclusão por tempo",
    "timeout_title": "Avanço automático",
    "timeout_content": "Este passo avança automaticamente quando o seu tempo limite termina.",
    "click_name": "Conclusão por clique",
    "click_title": "Confirmar com um clique",
    "click_content": "Clique no botão de confirmação destacado para concluir o passo.",
    "click_done_title": "Concluído",
    "click_done_content": "A interação declarada concluiu o passo anterior.",
    "input_name": "Conclusão por entrada",
    "input_title": "Introduza o seu nome",
    "input_content": "Introduza pelo menos três caracteres no campo de nome destacado.",
    "input_done_content": "A entrada escrita concluiu o passo anterior.",
    "keys_name": "Conclusão por teclado",
    "keys_title": "Confirmar com o teclado",
    "keys_content": "Foque o campo de nome e prima Enter ou Tab.",
    "keys_done_content": "A tecla premida concluiu o passo anterior.",
    "labels_name": "Etiquetas e painel personalizados",
    "labels_previous": "Voltar",
    "labels_next": "Continuar",
    "labels_finish": "Entendido",
    "labels_abort": "Sair do tour",
    "labels_close": "Dispensar",
    "labels_progress": "Passo {current} de {total}",
    "labels_title": "Etiquetas personalizadas",
    "labels_content": "Este passo é renderizado por uma estratégia de mensagem em painel com etiquetas personalizadas."
  },
  "component": {
    "fieldset": {
      "add": "Adicionar outro",
      "update": "Atualizar item",
      "cancel": "Cancelar",
      "not_unique": "O valor inserido já existe. Valor {0}",
      "max_items": "Pode criar até {0} itens.",
      "max_items_reached": "Máximo de {0} itens atingido."
    },
    "list": {
      "pagination": "A mostrar página <span class=\"text-bold\">{0} de {1}</span>",
      "loading": "A carregar dados",
      "search": {
        "title": "Nenhum dado encontrado para a pesquisa",
        "subtitle": "Pesquisou por: <ion-text color=\"primary\" class=\"display-block ion-text-center text-bold\">{0}</ion-text>",
        "button": "Limpar pesquisa"
      },
      "empty": {
        "title": "Nenhum dado encontrado",
        "subtitle": "",
        "button": "Criar"
      }
    },
    "list_item": {
      "actions": "Ações",
      "operations": {
        "read": "Ler",
        "create": "Criar",
        "update": "Atualizar",
        "delete": "Eliminar"
      }
    },
    "empty_state": {
      "title": "Nenhum dado encontrado",
      "button_create": "Criar",
      "search": {
        "title": "Nenhum dado encontrado para a pesquisa",
        "subtitle": "Pesquisou por: <ion-text color=\"primary\" class=\"display-block ion-text-center text-bold\">{0}</ion-text>",
        "button": "Limpar pesquisa"
      }
    },
    "pagination": {
      "resume": "A mostrar página <span class=\"text-bold\">{0} de {1}</span>"
    },
    "filter": {
      "title": "Filtrar",
      "type": "Introduzir valor",
      "select": "Filtrar seleção",
      "step1": "Selecionar um índice",
      "step2": "Selecionar uma condição",
      "step3": "Introduzir um valor",
      "no_suggestions": "Sem sugestões",
      "sort": "Ordenar por"
    },
    "stepped_form": {
      "next": "Seguinte",
      "previous": "Anterior",
      "submit": "Submeter",
      "cancel": "Cancelar"
    },
    "file_upload": {
      "drag_file": "Arraste e solte a sua imagem aqui",
      "button_select": "Selecionar ficheiro",
      "button_clear": "Limpar",
      "preview": "Pré-visualizar",
      "errors": {
        "not_allowed": "O arquivo {0} não é permitido.",
        "max_size": "O tamanho máximo permitido do ficheiro é {0} MB"
      }
    },
    "cron_selector": {
      "frequency": "Frequência da medicação",
      "close": "Fechar",
      "close_schedule": "Fechar plano",
      "modes": {
        "daily": "Diário",
        "hourly": "Intervalo",
        "weekly": "Semanal"
      },
      "dose": "Dose {0}",
      "remove": "Remover",
      "add_ocurrence": "Adicionar outro horário",
      "add_time": "Adicionar outro horário",
      "repeat_every": "Repetir a cada",
      "start_date_time": "Data e hora de início",
      "hours": "horas",
      "time": "Hora",
      "generated_schedule": "Horário gerado:",
      "enable_schedule": "Ativar plano",
      "disable_schedule": "Desativar plano",
      "weekdays": {
        "sunday": "Domingo",
        "monday": "Segunda-feira",
        "tuesday": "Terça-feira",
        "wednesday": "Quarta-feira",
        "thursday": "Quinta-feira",
        "friday": "Sexta-feira",
        "saturday": "Sábado"
      }
    },
    "cron_builder": {
      "quick_presets": "Predefinições rápidas",
      "every": "A cada",
      "minute": "minutos",
      "hour": "hora",
      "daily_at": "Diariamente às",
      "weekdays_preset": "Dias úteis",
      "all": "Todos",
      "monthly": "Mensal",
      "copy": "Copiar",
      "fields": {
        "minute": "Minuto",
        "hour": "Hora",
        "day": "Dia",
        "month": "Mês",
        "weekday": "Dia da semana"
      },
      "enable_step": "O 'A cada' só pode ser ativado para valores maiores ou iguais a 1. */0 é inválido.",
      "copied": "Copiado!",
      "add_another": "Adicionar outro",
      "step_value": {
        "hour": "Valor do intervalo em horas",
        "minute": "Valor do intervalo em minutos"
      },
      "increment": "Aumentar valor",
      "decrement": "Diminuir valor"
    },
    "dashboard": {
      "palette": "Componentes",
      "emptyPalette": "Nenhum componente de dashboard registado.",
      "deleteTitle": "Remover componente",
      "deleteConfirm": "Tem a certeza que deseja remover este componente?",
      "cancel": "Cancelar",
      "delete": "Apagar",
      "save": "Guardar Dashboard",
      "tile_position": "Coluna {col}, linha {row}, {cols} por {rows} células",
      "tile_keyboard_hint": "Use as setas para mover; segure Shift com as setas para redimensionar"
    }
  }
};
