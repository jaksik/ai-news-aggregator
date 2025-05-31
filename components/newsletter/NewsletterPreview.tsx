import React, { useState } from 'react';
import { INewsletter, INewsletterItem } from '../../models/Newsletter';

interface NewsletterPreviewProps {
  newsletter: INewsletter;
  onSave?: (newsletter: INewsletter) => void;
}

const NewsletterPreview: React.FC<NewsletterPreviewProps> = ({ newsletter, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableNewsletter, setEditableNewsletter] = useState(newsletter);
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    const content = generatePlainTextNewsletter(editableNewsletter);
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const generatePlainTextNewsletter = (newsletter: INewsletter): string => {
    let content = `${newsletter.title}\n`;
    content += `${'='.repeat(newsletter.title.length)}\n\n`;
    
    if (newsletter.intro) {
      content += `${newsletter.intro}\n\n`;
    }

    const sections = [
      { title: '🚀 Top Headlines', items: newsletter.sections.topHeadlines },
      { title: '💡 Product & Platform Updates', items: newsletter.sections.productUpdates },
      { title: '🔬 Research & Innovation', items: newsletter.sections.research }
    ];

    sections.forEach(section => {
      if (section.items.length > 0) {
        content += `${section.title}\n${'-'.repeat(section.title.length)}\n\n`;
        section.items.forEach((item, index) => {
          content += `${index + 1}. ${item.generatedHeadline}\n`;
          content += `   ${item.summary}\n`;
          content += `   Source: ${item.source} | Score: ${item.aiScore.toFixed(1)}\n\n`;
        });
      }
    });

    content += `---\n`;
    content += `Generated: ${new Date(newsletter.generatedAt).toLocaleString()}\n`;
    content += `Articles Processed: ${newsletter.articlesProcessed}\n`;
    
    return content;
  };
  const renderSection = (title: string, emoji: string, items: INewsletterItem[], sectionKey: keyof typeof editableNewsletter.sections) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">{emoji}</span>
          {title}
        </h3>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className={`border-l-4 border-blue-500 pl-4 ${isEditing ? 'hover:bg-gray-50 p-2 rounded' : ''}`}>
              {isEditing ? (
                <input
                  type="text"
                  value={item.generatedHeadline}
                  onChange={(e) => updateItemField(sectionKey, index, 'generatedHeadline', e.target.value)}
                  className="w-full font-medium text-gray-800 mb-1 border border-gray-300 rounded px-2 py-1"
                />
              ) : (
                <h4 className="font-medium text-gray-800 mb-1">
                  {item.generatedHeadline}
                </h4>
              )}
              
              {isEditing ? (
                <textarea
                  value={item.summary}
                  onChange={(e) => updateItemField(sectionKey, index, 'summary', e.target.value)}
                  className="w-full text-gray-600 text-sm mb-2 border border-gray-300 rounded px-2 py-1 resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-gray-600 text-sm mb-2">
                  {item.summary}
                </p>
              )}
              
              <div className="flex items-center text-xs text-gray-500">
                <span>Source: {item.source}</span>
                <span className="mx-2">•</span>
                <span>Score: {item.aiScore.toFixed(1)}</span>
                {isEditing && (
                  <>
                    <span className="mx-2">•</span>
                    <button
                      onClick={() => removeItem(sectionKey, index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️ Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const updateItemField = (sectionKey: keyof typeof editableNewsletter.sections, index: number, field: keyof INewsletterItem, value: string) => {
    const newNewsletter = { ...editableNewsletter };
    const item = newNewsletter.sections[sectionKey][index];
    if (item) {
      (item as unknown as Record<string, unknown>)[field] = value;
    }
    setEditableNewsletter(newNewsletter);
  };

  const removeItem = (sectionKey: keyof typeof editableNewsletter.sections, index: number) => {
    const newNewsletter = { ...editableNewsletter };
    newNewsletter.sections[sectionKey].splice(index, 1);
    setEditableNewsletter(newNewsletter);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {newsletter.title}
            </h1>
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span>Status: <span className="capitalize font-medium">{newsletter.status}</span></span>
              <span>Generated: {new Date(newsletter.generatedAt).toLocaleString()}</span>
              <span>Articles Processed: {newsletter.articlesProcessed}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {newsletter.aiPromptUsed.includes('OpenAI') ? 'Phase 2 - AI Enhanced' : 'Phase 1 - Basic Generation'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Intro */}
        {newsletter.intro && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 italic">{newsletter.intro}</p>
          </div>
        )}

        {/* Sections */}
        {renderSection('Top Headlines', '🚀', editableNewsletter.sections.topHeadlines, 'topHeadlines')}
        {renderSection('Product & Platform Updates', '💡', editableNewsletter.sections.productUpdates, 'productUpdates')}
        {renderSection('Research & Innovation', '🔬', editableNewsletter.sections.research, 'research')}

        {/* Summary Stats */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Generation Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Headlines:</span>
              <span className="ml-2 font-medium">{editableNewsletter.sections.topHeadlines.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Products:</span>
              <span className="ml-2 font-medium">{editableNewsletter.sections.productUpdates.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Research:</span>
              <span className="ml-2 font-medium">{editableNewsletter.sections.research.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Items:</span>
              <span className="ml-2 font-medium">
                {editableNewsletter.sections.topHeadlines.length + 
                 editableNewsletter.sections.productUpdates.length + 
                 editableNewsletter.sections.research.length}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
          >
            📝 {isEditing ? 'View Mode' : 'Edit Newsletter'}
          </button>
          <button 
            onClick={copyToClipboard}
            className={`px-4 py-2 rounded-md transition-colors flex items-center ${
              copySuccess 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copySuccess ? '✅ Copied!' : '📋 Copy Content'}
          </button>
          {onSave && (
            <button 
              onClick={() => onSave(editableNewsletter)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              💾 Save Changes
            </button>
          )}
          <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors">
            📧 Export as Email
          </button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
            📄 Export as PDF
          </button>
        </div>

        {/* Edit Mode Instructions */}
        {isEditing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Edit Mode:</strong> Click on headlines and summaries to edit them directly. 
              Changes will be saved when you click &quot;Save Changes&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterPreview;
