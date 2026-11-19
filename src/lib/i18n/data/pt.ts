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
