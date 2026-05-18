<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md bg-white shadow rounded-lg p-8 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p class="text-sm text-gray-500 mt-1">
          Déjà inscrit ?
          <NuxtLink to="/login" class="text-emerald-600 hover:underline">
            Se connecter
          </NuxtLink>
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-sm font-medium text-gray-700">Prénom</span>
            <input
              v-model="firstName"
              type="text"
              required
              class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
          </label>
          <label class="block">
            <span class="text-sm font-medium text-gray-700">Nom</span>
            <input
              v-model="lastName"
              type="text"
              required
              class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
          </label>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-gray-700">Email</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
        </label>

        <label class="block">
          <span class="text-sm font-medium text-gray-700">Mot de passe</span>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
          <span class="text-xs text-gray-500">8 caractères minimum.</span>
        </label>

        <label class="block">
          <span class="text-sm font-medium text-gray-700">Rôle</span>
          <select
            v-model="role"
            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Alternant">Alternant</option>
            <option value="Stagiaire">Stagiaire</option>
            <option value="Tutor">Tuteur</option>
          </select>
        </label>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="pending"
          class="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ pending ? 'Création…' : 'Créer mon compte' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from '@prisma/client'

definePageMeta({ auth: false, layout: false })

const { fetch: refreshSession } = useUserSession()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const role = ref<Role>('Alternant' as Role)
const pending = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  pending.value = true
  error.value = null
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        password: password.value,
        role: role.value
      }
    })
    await refreshSession()
    await navigateTo('/')
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; message?: string }
    error.value = e.statusMessage || e.message || 'Impossible de créer le compte'
  } finally {
    pending.value = false
  }
}
</script>
