import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Vote value mapping
const VOTE_VALUES = {
  low: 1,
  medium: 2,
  high: 3
}

const VOTE_LABELS = {
  1: 'low',
  2: 'medium', 
  3: 'high'
}

// Token vote mapping
const TOKEN_VOTE_VALUES = {
  low: 1,
  medium: 2,
  high: 3
}

const TOKEN_VOTE_LABELS = {
  1: 'low',
  2: 'medium', 
  3: 'high'
}

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export async function submitVote(voteValue, tokenId = null) {
  try {
    console.log('Submitting vote:', voteValue, 'for token:', tokenId)
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseAnonKey)
    
    const voteInt = VOTE_VALUES[voteValue]
    console.log('Converting vote to integer:', voteInt)
    
    const voteData = tokenId 
      ? { vote: voteInt, token_id: tokenId }
      : { vote: voteInt }
    
    const { data, error } = await supabase
      .from('moonmeter_votes')
      .insert([voteData])
    
    if (error) {
      console.error('Supabase insert error:', error)
      return { data: null, error }
    }
    
    console.log('Vote submitted successfully:', data)
    return { data, error: null }
  } catch (err) {
    console.error('Exception in submitVote:', err)
    return { data: null, error: err }
  }
}

export async function getVoteTally(tokenId = null) {
  try {
    console.log('Fetching vote tally for token:', tokenId)
    
    let query = supabase
      .from('moonmeter_votes')
      .select('vote')
    
    if (tokenId) {
      query = query.eq('token_id', tokenId)
    } else {
      query = query.is('token_id', null)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Supabase select error:', error)
      return { high: 0, medium: 0, low: 0 }
    }
    
    console.log('Vote data received:', data)
    
    const tally = { high: 0, medium: 0, low: 0 }
    if (data && Array.isArray(data)) {
      data.forEach(row => {
        const voteLabel = VOTE_LABELS[row.vote]
        if (voteLabel === 'high') tally.high++
        else if (voteLabel === 'medium') tally.medium++
        else if (voteLabel === 'low') tally.low++
      })
    }
    
    console.log('Calculated tally:', tally)
    return tally
  } catch (err) {
    console.error('Exception in getVoteTally:', err)
    return { high: 0, medium: 0, low: 0 }
  }
}

// Test function to check if table exists
export async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    const { data, error } = await supabase
      .from('moonmeter_votes')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Connection test failed:', error)
      return false
    }
    
    console.log('Connection test successful:', data)
    return true
  } catch (err) {
    console.error('Connection test exception:', err)
    return false
  }
}

// File validation function
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' }
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images only.' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size too large. Maximum size is 5MB.' }
  }
  
  return { valid: true }
}

// Upload image to Supabase Storage
export async function uploadImageToStorage(file) {
  try {
    console.log('Uploading image to Supabase Storage...')
    
    // Validate file first
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { url: null, error: validation.error }
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `merch-designs/${fileName}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('merch-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Storage upload error:', error)
      return { url: null, error: 'Failed to upload image. Please try again.' }
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('merch-images')
      .getPublicUrl(filePath)
    
    console.log('Image uploaded successfully:', urlData.publicUrl)
    return { url: urlData.publicUrl, error: null }
    
  } catch (err) {
    console.error('Exception in uploadImageToStorage:', err)
    return { url: null, error: 'Upload failed. Please try again.' }
  }
}

// Check for duplicate submissions
export async function checkForDuplicates(designData) {
  try {
    console.log('Checking for duplicate submissions...')
    
    // Check for recent submissions from same email (if provided)
    if (designData.email) {
      const { data: emailDuplicates, error: emailError } = await supabase
        .from('merch_designs')
        .select('id, created_at')
        .eq('email', designData.email)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(5)
      
      if (emailError) {
        console.error('Error checking email duplicates:', emailError)
      } else if (emailDuplicates && emailDuplicates.length >= 3) {
        return { isDuplicate: true, error: 'Too many submissions from this email. Please wait 24 hours.' }
      }
    }
    
    // Check for similar descriptions (basic duplicate detection)
    if (designData.description) {
      const { data: similarDesigns, error: descError } = await supabase
        .from('merch_designs')
        .select('id, description')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(10)
      
      if (descError) {
        console.error('Error checking description duplicates:', descError)
      } else if (similarDesigns) {
        // Simple similarity check (you can make this more sophisticated)
        const normalizedDesc = designData.description.toLowerCase().replace(/[^a-z0-9]/g, '')
        const isDuplicate = similarDesigns.some(design => {
          const normalizedExisting = design.description.toLowerCase().replace(/[^a-z0-9]/g, '')
          const similarity = calculateSimilarity(normalizedDesc, normalizedExisting)
          return similarity > 0.8 // 80% similarity threshold
        })
        
        if (isDuplicate) {
          return { isDuplicate: true, error: 'Similar design already submitted recently.' }
        }
      }
    }
    
    return { isDuplicate: false, error: null }
    
  } catch (err) {
    console.error('Exception in checkForDuplicates:', err)
    return { isDuplicate: false, error: null } // Allow submission if check fails
  }
}

// Simple similarity calculation (Levenshtein distance based)
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0
  if (str1.length === 0) return 0.0
  if (str2.length === 0) return 0.0
  
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1, str2) {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Merch design functions
export async function submitDesign(designData) {
  try {
    console.log('Submitting design:', designData)
    
    // Check for duplicates first
    const duplicateCheck = await checkForDuplicates(designData)
    if (duplicateCheck.isDuplicate) {
      return { data: null, error: duplicateCheck.error }
    }
    
    const { data, error } = await supabase
      .from('merch_designs')
      .insert([{
        name: designData.name,
        email: designData.email,
        design_type: designData.designType,
        description: designData.description,
        image_url: designData.imageUrl || null,
        votes: 0
      }])
    
    if (error) {
      console.error('Design submit error:', error)
      return { data: null, error }
    }
    
    console.log('Design submitted successfully:', data)
    return { data, error: null }
  } catch (err) {
    console.error('Exception in submitDesign:', err)
    return { data: null, error: err }
  }
}

export async function getDesigns() {
  try {
    console.log('Fetching designs...')
    
    const { data, error } = await supabase
      .from('merch_designs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Design fetch error:', error)
      return []
    }
    
    console.log('Designs fetched:', data)
    return data || []
  } catch (err) {
    console.error('Exception in getDesigns:', err)
    return []
  }
}

export async function voteDesign(designId) {
  try {
    console.log('Voting for design:', designId)
    
    // First get current votes
    const { data: currentDesign, error: fetchError } = await supabase
      .from('merch_designs')
      .select('votes')
      .eq('id', designId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching current votes:', fetchError)
      return { data: null, error: fetchError }
    }
    
    // Update votes
    const { data, error } = await supabase
      .from('merch_designs')
      .update({ votes: (currentDesign.votes || 0) + 1 })
      .eq('id', designId)
    
    if (error) {
      console.error('Design vote error:', error)
      return { data: null, error }
    }
    
    console.log('Design voted successfully:', data)
    return { data, error: null }
  } catch (err) {
    console.error('Exception in voteDesign:', err)
    return { data: null, error: err }
  }
}

// Token submission functions for MoonSafe Meter
export async function submitTokenSubmission(submissionData) {
  try {
    console.log('Submitting token for MoonSafe Meter:', submissionData)
    
    // Check for duplicate submissions
    const { data: existingTokens, error: checkError } = await supabase
      .from('token_submissions')
      .select('token_name, token_address')
      .or(`token_name.eq.${submissionData.tokenName},token_address.eq.${submissionData.tokenAddress}`)
    
    if (checkError) {
      console.error('Error checking duplicates:', checkError)
    } else if (existingTokens && existingTokens.length > 0) {
      return { data: null, error: 'This token has already been submitted for review.' }
    }
    
    const { data, error } = await supabase
      .from('token_submissions')
      .insert([{
        token_name: submissionData.tokenName,
        token_address: submissionData.tokenAddress,
        submitter_name: submissionData.submitterName,
        submitter_contact: submissionData.submitterContact,
        description: submissionData.description,
        social_links: submissionData.socialLinks,
        status: 'pending', // pending, approved, rejected
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Token submission error:', error)
      return { data: null, error }
    }
    
    console.log('Token submitted successfully:', data)
    return { data, error: null }
  } catch (err) {
    console.error('Exception in submitTokenSubmission:', err)
    return { data: null, error: err }
  }
}

export async function getTokenSubmissions(status = null) {
  try {
    console.log('Fetching token submissions...')
    
    let query = supabase
      .from('token_submissions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Token submissions fetch error:', error)
      return []
    }
    
    console.log('Token submissions fetched:', data)
    return data || []
  } catch (err) {
    console.error('Exception in getTokenSubmissions:', err)
    return []
  }
}

export async function updateTokenSubmissionStatus(submissionId, status, adminNotes = '') {
  try {
    console.log('Updating token submission status:', submissionId, status)
    
    const { data, error } = await supabase
      .from('token_submissions')
      .update({ 
        status: status,
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
    
    if (error) {
      console.error('Token submission update error:', error)
      return { data: null, error }
    }
    
    console.log('Token submission updated successfully:', data)
    return { data, error: null }
  } catch (err) {
    console.error('Exception in updateTokenSubmissionStatus:', err)
    return { data: null, error: err }
  }
}

// Get approved tokens for voting
export async function getApprovedTokens() {
  try {
    console.log('Fetching approved tokens...')
    
    const { data, error } = await supabase
      .from('token_submissions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching approved tokens:', error)
      return []
    }
    
    console.log('Approved tokens fetched:', data)
    return data || []
  } catch (err) {
    console.error('Exception in getApprovedTokens:', err)
    return []
  }
}

// Get specific token by ID
export async function getTokenById(tokenId) {
  try {
    console.log('Fetching token by ID:', tokenId)
    
    const { data, error } = await supabase
      .from('token_submissions')
      .select('*')
      .eq('id', tokenId)
      .single()
    
    if (error) {
      console.error('Error fetching token:', error)
      return null
    }
    
    console.log('Token fetched:', data)
    return data
  } catch (err) {
    console.error('Exception in getTokenById:', err)
    return null
  }
} 