import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Link2, Camera, FileText, CreditCard, Sparkles, Clock } from 'lucide-react';

export function FAQ() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <HelpCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-slate-600">Everything you need to know about Meal Scrape</p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Getting Started
              </CardTitle>
              <CardDescription>Learn the basics of using Meal  Scrape</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is Meal Scrape?</AccordionTrigger>
                  <AccordionContent>
                    Meal Scrape is an AI-powered recipe management app that helps you save, organize, and discover recipes from anywhere on the internet. Simply paste a URL, upload a photo, or manually enter recipes to build your personal cookbook.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>How do I create an account?</AccordionTrigger>
                  <AccordionContent>
                    Click "Sign Up" on the home page and enter your email and password. You'll receive a verification email to confirm your account. Once verified, you can start saving recipes immediately!
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Is there a mobile app?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Meal Scrape works great on mobile browsers and we have native iOS and Android apps coming soon. The web version is fully responsive and works on all devices.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
  {/* Recipe Extraction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Link2 className="w-6 h-6 text-blue-600" />
                Recipe Extraction
              </CardTitle>
              <CardDescription>Learn how to add, edit, and organize your recipes</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
               <AccordionItem value="item-10" className="border-none">
                  <div className="font-medium py-4">What are the 4 ways to add recipes?</div>
                  <div className="pb-4">
                    <div className="space-y-4">
                      {/* From Social Media/URLs */}
                      <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                            <Link2 className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900">1. Import From URL</h4>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-700 ml-2">
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-purple-600 shrink-0">•</span>
                            <span>For social media, click "Share" button → "Copy" link</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-purple-600 shrink-0">•</span>
                            <span>For websites, click "Ctrl/CMD + C" over hyperlink</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-purple-600 shrink-0">•</span>
                            <span>Open Meal Scrape → Add Recipe → "Import From URL" → Paste → "Extract Recipe"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-purple-600 shrink-0">•</span>
                            <span>Revise in "Input Manually" tab if needed</span>
                          </li>
                        </ol>
                        <p className="text-xs text-slate-600 mt-2 italic">⏱️ Takes 5-15 seconds</p>
                      </div>

                      {/* Paste Notes */}
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900">2. Paste Notes</h4>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-700 ml-2">
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-orange-600 shrink-0">•</span>
                            <span>Click "Add Recipe" → "Paste Notes" tab</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-orange-600 shrink-0">•</span>
                            <span>Paste personal notes or video transcript from online source</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-orange-600 shrink-0">•</span>
                            <span>Click "Extract" and edit as needed in "Input Manually"</span>
                          </li>
                        </ol>
                        <p className="text-xs text-slate-600 mt-2 italic">⏱️ Takes 2-5 seconds (fastest!)</p>
                      </div>

                      {/* Upload Photos */}
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900">3. Upload Photos</h4>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-700 ml-2">
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600 shrink-0">•</span>
                            <span>Screenshot recipe from device</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600 shrink-0">•</span>
                            <span>Open Meal Scrape → Add Recipe → Upload Photos</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600 shrink-0">•</span>
                            <span>Select your photo(s) → Upload</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600 shrink-0">•</span>
                            <span>Edit in the "Input Manually" tab</span>
                          </li>
                        </ol>
                        <p className="text-xs text-slate-600 mt-2 italic">⏱️ Takes 2-5 seconds</p>
                      </div>

                      {/* Manual Input */}
                      <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900">4. Input Manually</h4>
                        </div>
                        <p className="text-sm text-slate-700 ml-2">
                          Type in recipes by hand for full control over every detail
                        </p>
                        <p className="text-xs text-slate-600 mt-2 italic">⏱️ Takes as long as you need</p>
                      </div>

                      {/* Pro Tip */}
                      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-4 border-2 border-blue-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-1">Pro Tip</h4>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              For YouTube videos with bot detection errors, use "Paste Notes" instead! Copy the video description and paste it directly - works every time.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionItem>
        {/* Adding Recipes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-blue-600" />
                Managing Recipes
              </CardTitle>
              <CardDescription>Learn how to import recipes from various sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-4">
                  <AccordionTrigger>How does URL extraction work?</AccordionTrigger>
                  <AccordionContent>
                    Simply paste any recipe URL and our AI will automatically extract the title, ingredients, instructions, cooking times, and more. We support all major recipe websites, blogs, and social media platforms including Instagram, TikTok, and YouTube.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>If YouTube extraction fails?</AccordionTrigger>
                  <AccordionContent>
                    If you see a bot detection error, use the purple "Paste Notes" tab! Just copy the video description from YouTube (click "...more" to expand it) and paste it into Meal Scrape. Our AI will extract the recipe in 2-5 seconds with 95%+ accuracy.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>Can I extract recipes from photos?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Use the "Upload Photo" tab to scan recipe cards, cookbook pages, or handwritten recipes. Our AI uses OCR technology to read the text and structure it into a proper recipe format. You can upload up to 4 photos at once.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger>How accurate is the AI extraction?</AccordionTrigger>
                  <AccordionContent>
                    Our AI is 85-95% accurate depending on the source. We always show you a preview before saving, so you can review and edit any details. Most recipes need only minor tweaks like adjusting measurements or reordering steps.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8">
                  <AccordionTrigger>Which websites are supported?</AccordionTrigger>
                  <AccordionContent>
                    We support virtually all recipe websites and blogs including AllRecipes, Food Network, Bon Appétit, Serious Eats, and thousands more. Social media platforms like Instagram, TikTok, and YouTube are also supported. If a site has a recipe, we can extract it!
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-9">
                  <AccordionTrigger>Why is extraction taking so long?</AccordionTrigger>
                  <AccordionContent>
                    URL extraction typically takes 5-15 seconds for most websites. Instagram and TikTok videos may take 30-60 seconds due to audio transcription. If it's your first request of the day, the server may need 20-30 seconds to wake up. For instant results, use the "Paste Notes" or "Upload Photo" options which take only 2-5 seconds.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

     

                <AccordionItem value="item-11">
                  <AccordionTrigger>Can I edit recipes after saving?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! Click the 3 dot recipe on in the Discover Recipe page, then click the "edit button" to make changes. You can update ingredients, instructions, photos, cooking times, tags, and more. All changes are saved automatically. It will create a new recipe, just delete the old.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-12">
                  <AccordionTrigger>How do I organize my recipes?</AccordionTrigger>
                  <AccordionContent>
                    Recipes can be organized using cuisine types, meal types (breakfast, lunch, dinner), dietary tags (vegan, gluten-free, etc.), and difficulty levels. You can also search recipes by title or ingredients, and filter by any combination of tags.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-13">
                  <AccordionTrigger>Can I add my own photos?</AccordionTrigger>
                  <AccordionContent>
                    Yes! When adding or editing a recipe, you can upload your own photos of the finished dish. This helps you remember what the recipe looks like and makes your collection more personal.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-14">
                  <AccordionTrigger>What happens if I save a recipe twice?</AccordionTrigger>
                  <AccordionContent>
                    Meal Scrape will detect duplicate recipes and and delete one. Or you can go in and delete/edit yourself.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Subscription & Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-6 h-6 text-blue-600" />
                Subscription & Payment
              </CardTitle>
              <CardDescription>Learn about pricing and payment options</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-15">
                  <AccordionTrigger>Is Meal Scrape free?</AccordionTrigger>
                  <AccordionContent>
                    Meal Scrape offers a generous 6-month early bird trial for new users! After the trial, we offer "pay what you want" plans, making it affordable for everyone.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-16">
                  <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                  <AccordionContent>
                    We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor Stripe. We do not store your payment information on our servers.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-17">
                  <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
                  <AccordionContent>
                    Yes! You can cancel your subscription at any time from the Settings page. You'll continue to have access until the end of your current billing period. All your recipes will remain saved but will need to subscribe to see them again.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-18">
                  <AccordionTrigger>Do you offer refunds?</AccordionTrigger>
                  <AccordionContent>
                    Currently not offering refunds, but it is a pay what you want model.  You should be satisfied, if not, send "Mealscrape" a DM!
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-19">
                  <AccordionTrigger>Is there a family plan?</AccordionTrigger>
                  <AccordionContent>
                    Not at the moment, the app is very affordable, just refer your family for their own accounts.  You can view eachother's social media profile to see what recipes you like.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="w-6 h-6 text-blue-600" />
                Features & Capabilities
              </CardTitle>
              <CardDescription>Discover what Meal Scrape can do</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-20">
                  <AccordionTrigger>What is Cook Mode?</AccordionTrigger>
                  <AccordionContent>
                    Cook Mode is a hands-free cooking assistant that displays recipes in a large, easy-to-read format. It keeps your screen awake, allows you to check off steps as you go, and can even read instructions aloud (coming soon). Perfect for keeping your phone clean while cooking!
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-21">
                  <AccordionTrigger>Can I create meal plans?</AccordionTrigger>
                  <AccordionContent>
                    Yes! The Meal Planner lets you schedule recipes for specific dates and times. You can plan your entire week, generate shopping lists from your meal plan, and get reminders for meal prep. Perfect for staying organized and reducing food waste.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-22">
                  <AccordionTrigger>How do grocery lists work?</AccordionTrigger>
                  <AccordionContent>
                    Add recipes to your grocery list and we'll automatically combine ingredients, organize them by category, and let you check items off as you shop. You can also manually add items or share the list with family members.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-23">
                  <AccordionTrigger>Can I share recipes with friends?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! You can share recipes via link, email, or social media. You can also follow other users, discover their public recipes, and build a community of fellow food enthusiasts.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-24">
                  <AccordionTrigger>Is my data private and secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Your recipes and personal data are stored securely with enterprise-grade encryption. We never sell your data to third parties. You control which recipes are public or private, and you can delete your account and all data at any time.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="w-6 h-6 text-blue-600" />
                Troubleshooting
              </CardTitle>
              <CardDescription>Solutions to common issues</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-25">
                  <AccordionTrigger>The extraction isn't working</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p>Try these steps in order:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Switch to the "Paste Notes" tab and copy/paste the recipe text directly</li>
                        <li>Try the "Upload Photo" tab if you can screenshot the recipe</li>
                        <li>Wait 30 seconds and try again (server may be waking up)</li>
                        <li>Check that the URL is publicly accessible</li>
                        <li>Use the "Input Manually" tab as a last resort</li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-26">
                  <AccordionTrigger>I'm not receiving verification emails</AccordionTrigger>
                  <AccordionContent>
                    Check your spam folder first. If it's not there, make sure you entered the correct email address and try resending the verification email. If issues persist, dm in app @mealscrapeapp or email mealscrapeapp@gmail.com
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-27">
                  <AccordionTrigger>The app is slow or not loading</AccordionTrigger>
                  <AccordionContent>
                    Try refreshing the page or clearing your browser cache. Make sure you have a stable internet connection. If the problem persists, the server may be experiencing high traffic - wait a few minutes and try again.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-28">
                  <AccordionTrigger>How do I report a bug or request a feature?</AccordionTrigger>
                  <AccordionContent>
                    We love feedback! Contact us at support@mealscrape.com or use the feedback form in the Settings page. Include details about the issue or feature request, and we'll respond within 24-48 hours.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Still Have Questions */}
        <Card className="mt-8 border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
              <p className="text-slate-600 mb-4">
                We're here to help! Contact our support team anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:mealscrapeapp@gmail.com"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Email Support
                </a>
                <a
                  href="/settings"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  View Settings
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
