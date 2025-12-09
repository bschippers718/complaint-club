'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  CATEGORY_CONFIG, 
  type Category 
} from '@/lib/categories'
import {
  type ShareData,
  generateShareText,
  generateEmailSubject,
  generateEmailBody,
  generateSmsText,
  getNeighborhoodUrl,
  getTopCategories,
  copyToClipboard,
  openSms,
  openEmail,
  nativeShare,
  canNativeShare,
  getNeighborhoodSuperlative
} from '@/lib/share-utils'
import { Check, Copy, MessageSquare, Mail, Link2, Share2 } from 'lucide-react'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ShareData
}

export function ShareModal({ open, onOpenChange, data }: ShareModalProps) {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  
  const topCategories = getTopCategories(data.categoryCounts, 4)
  const superlative = getNeighborhoodSuperlative(data)
  const shareText = generateShareText(data)
  const url = getNeighborhoodUrl(data.neighborhoodId)
  
  const handleCopyText = async () => {
    const success = await copyToClipboard(shareText)
    if (success) {
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    }
  }
  
  const handleCopyLink = async () => {
    const success = await copyToClipboard(url)
    if (success) {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }
  
  const handleSms = () => {
    openSms(generateSmsText(data))
  }
  
  const handleEmail = () => {
    openEmail(generateEmailSubject(data), generateEmailBody(data))
  }
  
  const handleNativeShare = async () => {
    const success = await nativeShare(data)
    if (success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📤</span>
            Share {data.neighborhoodName}
          </DialogTitle>
          <DialogDescription>
            Spread the word about NYC&apos;s complaint hotspots!
          </DialogDescription>
        </DialogHeader>
        
        {/* Stats Preview */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          {superlative && (
            <p className="font-semibold text-center">{superlative}</p>
          )}
          
          <div className="flex flex-wrap justify-center gap-2">
            {topCategories.filter(c => c.count > 0).map(({ category, count }) => (
              <div
                key={category}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${CATEGORY_CONFIG[category].bgColor}`}
              >
                <span>{CATEGORY_CONFIG[category].icon}</span>
                <span className="font-medium">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            #{data.rank} in NYC • Chaos Score: {data.chaosScore}/100
          </div>
        </div>
        
        {/* Share Buttons */}
        <div className="space-y-2">
          {/* Native Share (mobile) */}
          {canNativeShare() && (
            <Button
              variant="default"
              className="w-full justify-start gap-3"
              onClick={handleNativeShare}
            >
              <Share2 className="h-4 w-4" />
              Share...
            </Button>
          )}
          
          {/* Copy Text */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleCopyText}
          >
            {copiedText ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Share Text
              </>
            )}
          </Button>
          
          {/* SMS/iMessage */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleSms}
          >
            <MessageSquare className="h-4 w-4" />
            Share via Text / iMessage
          </Button>
          
          {/* Email */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleEmail}
          >
            <Mail className="h-4 w-4" />
            Share via Email
          </Button>
          
          {/* Copy Link */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleCopyLink}
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Link Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
        
        {/* Preview Text */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Preview share text
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap overflow-auto max-h-40">
            {shareText}
          </pre>
        </details>
      </DialogContent>
    </Dialog>
  )
}

// Quick share button for leaderboard rows
interface QuickShareButtonProps {
  neighborhoodName: string
  neighborhoodId: number
  category: Category
  count: number
  rank: number
  className?: string
}

export function QuickShareButton({ 
  neighborhoodName, 
  neighborhoodId, 
  category, 
  count, 
  rank,
  className 
}: QuickShareButtonProps) {
  const [copied, setCopied] = useState(false)
  
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const config = CATEGORY_CONFIG[category]
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://311complaints.nyc'}/n/${neighborhoodId}?highlight=${category}`
    const text = `${config.icon} ${neighborhoodName} is #${rank} in NYC for ${config.label.toLowerCase()} with ${count.toLocaleString()} complaints! ${url}`
    
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      className={`p-1.5 rounded-md hover:bg-muted/50 transition-colors ${className || ''}`}
      title="Copy share text"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Share2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  )
}

