import { supabase } from './useSupabase'
import type { Draft, Entry } from '../types'

export function useDraft() {
  const createDraft = async (subject: string, password: string): Promise<Draft | null> => {
    const { data, error } = await supabase
      .from('drafts')
      .insert({ subject, password })
      .select()
      .single()

    if (error) {
      console.error('Error creating draft:', error)
      return null
    }

    return data
  }

  const getDraft = async (id: string): Promise<Draft | null> => {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching draft:', error)
      return null
    }

    return data
  }

  const updateDraft = async (id: string, subject: string, password: string): Promise<Draft | null> => {
    const { data, error } = await supabase
      .from('drafts')
      .update({ subject, password, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating draft:', error)
      return null
    }

    return data
  }

  const deleteDraft = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting draft:', error)
      return false
    }

    return true
  }

  const verifyPassword = async (id: string, password: string): Promise<boolean> => {
    const draft = await getDraft(id)
    return draft?.password === password
  }

  const getEntries = async (draftId: string): Promise<Entry[]> => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching entries:', error)
      return []
    }

    return data || []
  }

  const addEntry = async (draftId: string, name: string, imageUrl: string | null = null): Promise<Entry | null> => {
    const { data, error } = await supabase
      .from('entries')
      .insert({ draft_id: draftId, name, image_url: imageUrl })
      .select()
      .single()

    if (error) {
      console.error('Error adding entry:', error)
      return null
    }

    return data
  }

  const updateEntry = async (entryId: string, name: string, imageUrl: string | null = null): Promise<Entry | null> => {
    const { data, error } = await supabase
      .from('entries')
      .update({ name, image_url: imageUrl })
      .eq('id', entryId)
      .select()
      .single()

    if (error) {
      console.error('Error updating entry:', error)
      return null
    }

    return data
  }

  const deleteEntry = async (entryId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      console.error('Error deleting entry:', error)
      return false
    }

    return true
  }

  const uploadImage = async (file: File, draftId: string, entryId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${draftId}/${entryId}.${fileExt}`
    const filePath = `entries/${fileName}`

    console.log('[uploadImage] Uploading to path:', filePath)
    console.log('[uploadImage] Using bucket name: entry-images')

    const { error: uploadError } = await supabase.storage
      .from('entry-images')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return null
    }

    // List files to verify the upload worked
    const { data: listData, error: listError } = await supabase.storage
      .from('entry-images')
      .list(`entries/${draftId}`, {
        limit: 100,
        offset: 0,
      })
    
    if (!listError) {
      console.log('[uploadImage] Files in bucket after upload:', listData)
    }

    // Get the public URL - use the same path that was uploaded
    const { data } = supabase.storage
      .from('entry-images')
      .getPublicUrl(filePath)

    console.log('[uploadImage] Generated public URL:', data.publicUrl)
    console.log('[uploadImage] File path used for URL:', filePath)
    
    // The 400 error on HEAD requests is likely a bucket policy issue
    // But the URL format should be correct. The issue is that the bucket
    // needs to have proper public read policies set up.
    // For now, return the URL - sometimes HEAD fails but GET (used by img tags) works
    
    return data.publicUrl
  }

  const getAllDrafts = async (): Promise<Draft[]> => {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching all drafts:', error)
      return []
    }

    return data || []
  }

  return {
    createDraft,
    getDraft,
    getAllDrafts,
    updateDraft,
    deleteDraft,
    verifyPassword,
    getEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    uploadImage,
  }
}
