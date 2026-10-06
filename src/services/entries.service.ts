import api from './api'
import { fetchFile } from './download'

export const entriesService = {
  async list(projectId: number, params = {}) {
    const { data } = await api.get(`/projects/${projectId}/entries`, { params })
    return data
  },
  async get(projectId: number, id: number) {
    const { data } = await api.get(`/projects/${projectId}/entries/${id}`)
    return data.data
  },
  async create(projectId: number, payload: object) {
    const { data } = await api.post(`/projects/${projectId}/entries`, payload)
    return data.data
  },
  async update(projectId: number, id: number, payload: object) {
    const { data } = await api.put(`/projects/${projectId}/entries/${id}`, payload)
    return data.data
  },
  async remove(projectId: number, id: number) {
    await api.delete(`/projects/${projectId}/entries/${id}`)
  },
  async submit(projectId: number, id: number) {
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/submit`)
    return data.data
  },
  async approve(projectId: number, id: number) {
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/approve`)
    return data.data
  },
  async importTemplate(projectId: number) {
    return fetchFile(`/projects/${projectId}/entries/import/template`, 'template-import-entri.xlsx')
  },
  async importPreview(projectId: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/projects/${projectId}/entries/import/preview`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
  async importCommit(projectId: number, rows: object[]) {
    const { data } = await api.post(`/projects/${projectId}/entries/import`, { rows })
    return data.data
  },
  async uploadAttachment(projectId: number, id: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    // Content-Type eksplisit: instance axios default-nya JSON dan akan mengubah FormData menjadi JSON
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/attachment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
  async removeAttachment(projectId: number, id: number) {
    const { data } = await api.delete(`/projects/${projectId}/entries/${id}/attachment`)
    return data.data
  },
  async downloadAttachment(projectId: number, id: number, fallbackName: string) {
    return fetchFile(`/projects/${projectId}/entries/${id}/attachment`, fallbackName)
  },
  async history(projectId: number, id: number) {
    const { data } = await api.get(`/projects/${projectId}/entries/${id}/history`)
    return data.data
  },
  async reject(projectId: number, id: number, reason: string) {
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/reject`, { reason })
    return data.data
  },
  async bulk(projectId: number, entries: object[]) {
    const { data } = await api.post(`/projects/${projectId}/entries/bulk`, { entries })
    return data.data
  },
}
