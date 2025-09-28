<template>
  <div class="ui-input" :class="{ 'ui-input_error': hasError }">
    <label v-if="label" class="ui-input__label" :for="inputId">{{ label }}</label>

    <input
      :id="inputId"
      ref="inputRef"
      class="ui-input__control"
      v-model="innerValue"
      :type="type"
      :name="name"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      :min="min"
      :max="max"
      :minlength="minlength"
      :maxlength="maxlength"
      :step="step"
      :inputmode="inputmode"
      v-bind="inputAttrs"
      @blur="handleBlur"
      @focus="handleFocus"
      @change="handleChange"
      @input="handleInput"
    />

    <p v-if="hint && !hasError" class="ui-input__hint">{{ hint }}</p>
    <p v-if="error" class="ui-input__error-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string | number | null
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'hidden'
  label?: string
  name?: string
  id?: string
  placeholder?: string
  autocomplete?: string
  required?: boolean
  disabled?: boolean
  min?: number | string
  max?: number | string
  minlength?: number
  maxlength?: number
  step?: number | string
  inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
  hint?: string
  error?: string | null
}>(), {
  modelValue: null,
  type: 'text',
  label: '',
  name: '',
  id: '',
  placeholder: '',
  autocomplete: '',
  required: false,
  disabled: false,
  min: undefined,
  max: undefined,
  minlength: undefined,
  maxlength: undefined,
  step: undefined,
  inputmode: undefined,
  hint: '',
  error: null
})

const emit = defineEmits<{(e: 'update:modelValue', value: string | number | null): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
  (e: 'change', event: Event): void
  (e: 'input', event: Event): void
}>()

const attrs = useAttrs()
const inputRef = ref<HTMLInputElement | null>(null)
const inputId = computed(() => props.id || props.name || undefined)
const hasError = computed(() => Boolean(props.error))

const innerValue = computed({
  get() {
    if (props.type === 'number') {
      if (props.modelValue === null || props.modelValue === undefined) return ''
      return props.modelValue
    }
    return props.modelValue ?? ''
  },
  set(val: unknown) {
    if (props.type === 'number') {
      if (val === '' || val === null) {
        emit('update:modelValue', null)
      } else if (typeof val === 'number') {
        emit('update:modelValue', val)
      } else if (typeof val === 'string') {
        const parsed = Number(val)
        emit('update:modelValue', Number.isNaN(parsed) ? null : parsed)
      }
    } else {
      emit('update:modelValue', typeof val === 'string' ? val : String(val ?? ''))
    }
  }
})

const inputAttrs = computed<Record<string, unknown>>(() => {
  const { class: _cls, style: _style, ...rest } = attrs
  return rest
})

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}
function handleFocus(event: FocusEvent) {
  emit('focus', event)
}
function handleChange(event: Event) {
  emit('change', event)
}
function handleInput(event: Event) {
  emit('input', event)
}
</script>

<style scoped>
.ui-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ui-input__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.ui-input__control {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 1rem;
  background-color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  color: #111827;
}

.ui-input__control::placeholder {
  color: #9ca3af;
}

.ui-input__control:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.ui-input_error .ui-input__control {
  border-color: #ef4444;
}

.ui-input__hint {
  font-size: 0.75rem;
  color: #6b7280;
}

.ui-input__error-text {
  font-size: 0.75rem;
  color: #dc2626;
}
</style>
