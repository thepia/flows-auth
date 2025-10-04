<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { getLocale } from '../../paraglide/runtime.js';

  let authStore = null;
  let SignInCore = null;
  let SignInFormComponent = null;
  let emailInput = '';

  // 🔑 Reactive locale tracking for component rerenders
  $: currentLocale = getLocale();


  onMount(async () => {
    if (!browser) return;

    try {
      const { createAuthStore, makeSvelteCompatible, SignInForm, SignInCore: SignInCoreComponent } = await import('@thepia/flows-auth');

      const zustandStore = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        enablePasskeys: true,
        enableMagicLinks: false
      });

      authStore = makeSvelteCompatible(zustandStore);

      SignInCore = SignInCoreComponent;
      SignInFormComponent = SignInForm;

      console.log('✅ Auth components loaded successfully');
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
  });

  function handleSignInSuccess(detail) {
  console.log('✅ SignInForm Success:', detail);
  console.log(`🎉 User ${detail.user.email} successfully authenticated via ${detail.method}`);
}

function handleSignInError(detail) {
  console.error('❌ SignInForm Error:', detail);
  console.log(`⚠️ Authentication error: ${detail.error.message || detail.error.code}`);
}

function handleStepChange(detail) {
  console.log('🔄 SignInForm Step Change:', detail);
  console.log(`📍 Authentication flow step: ${detail.step}`);
}
</script>

<svelte:head>
  <title>Thepia Flows - Custom Workflow Apps for Personal Devices</title>
  <meta name="description" content="We build privacy-first workflow applications that run on your employees' BYOD/Personally Assigned devices. Mobile-optimized, camera-enabled, and designed for seamless visual documentation." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<!-- 🔑 Conditional wrapper forces rerender when locale changes -->
{#if currentLocale}
<main class="min-h-screen bg-white">
  <!-- Hero Section -->
  <section class="py-section bg-gradient-to-r from-primary/10 to-primary/5">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Content Column -->
        <div class="text-center lg:text-left">
          <!-- Main Heading -->
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 leading-tight">
            Custom Workflow Apps for 
            <span class="gradient-text">Personal Devices</span>
          </h1>
          
          <!-- Subheading -->
          <p class="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto lg:mx-0 leading-relaxed">
            We build privacy-first workflow applications that run on your employees' BYOD/Personally Assigned devices.
            Mobile-optimized, camera-enabled, and designed for seamless visual documentation.
          </p>
          
          <!-- Key Benefits -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto lg:mx-0">
            <div class="flex items-center justify-center lg:justify-start">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <span class="text-gray-700 font-medium">Privacy-First</span>
              </div>
            </div>
            
            <div class="flex items-center justify-center lg:justify-start">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <span class="text-gray-700 font-medium">Mobile-Optimized</span>
              </div>
            </div>
            
            <div class="flex items-center justify-center lg:justify-start">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <span class="text-gray-700 font-medium">Visual Documentation</span>
              </div>
            </div>
          </div>
          
          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
            <button class="btn-primary text-lg px-8 py-4">
              Try Live Demo
            </button>
            <a href="#how-it-works" class="btn-outline text-lg px-8 py-4">
              Learn More
            </a>
          </div>
        </div>
        
        <!-- Illustration Column -->
        <div class="flex justify-center lg:justify-end">
          <div class="relative">
            <div class="w-full max-w-md mx-auto bg-gray-100 rounded-lg p-8 flex items-center justify-center h-80">
              <div class="text-center text-gray-500">
                <svg class="w-24 h-24 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-sm">Team Collaboration Illustration</p>
              </div>
            </div>
            <!-- Decorative elements -->
            <div class="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full"></div>
            <div class="absolute -bottom-4 -left-4 w-12 h-12 bg-primary/30 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
  <section id="how-it-works" class="py-section">
    <div class="container mx-auto px-4">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-serif mb-6">How It Works</h2>
        <p class="text-xl text-gray-700 max-w-3xl mx-auto">
          Transform your manual processes into streamlined digital workflows in three simple steps
        </p>
      </div>
      
      <!-- Steps Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Step 1 -->
        <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
          <!-- Step Image -->
          <div class="bg-primary/5 p-8 flex items-center justify-center">
            <div class="h-48 w-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div class="text-center text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-xs">Coding</p>
              </div>
            </div>
          </div>
          
          <!-- Step Content -->
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mr-3 font-semibold">1</div>
              <h3 class="text-xl font-medium">Build Your Workflow</h3>
            </div>
            <p class="text-gray-600 mb-6">
              Share your existing process documentation. We analyze requirements and build a tailored Svelte application optimized for your specific workflow.
            </p>
            
            <!-- Features List -->
            <ul class="space-y-2">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Process analysis & optimization</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Mobile-first development</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Camera & visual integration</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
          <!-- Step Image -->
          <div class="bg-blue-50 p-8 flex items-center justify-center">
            <div class="h-48 w-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div class="text-center text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                </svg>
                <p class="text-xs">Team Training</p>
              </div>
            </div>
          </div>
          
          <!-- Step Content -->
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mr-3 font-semibold">2</div>
              <h3 class="text-xl font-medium">Train Your Team</h3>
            </div>
            <p class="text-gray-600 mb-6">
              Onboard employees with guided workflows and comprehensive training. Your team learns the new process while maintaining productivity.
            </p>
            
            <!-- Features List -->
            <ul class="space-y-2">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Interactive training modules</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Progress tracking</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Support & documentation</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
          <!-- Step Image -->
          <div class="bg-green-50 p-8 flex items-center justify-center">
            <div class="h-48 w-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div class="text-center text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                </svg>
                <p class="text-xs">Analytics</p>
              </div>
            </div>
          </div>
          
          <!-- Step Content -->
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mr-3 font-semibold">3</div>
              <h3 class="text-xl font-medium">Analyze Results</h3>
            </div>
            <p class="text-gray-600 mb-6">
              Monitor performance with real-time analytics and insights. Continuous optimization ensures your workflow evolves with your business needs.
            </p>
            
            <!-- Features List -->
            <ul class="space-y-2">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Real-time monitoring</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Performance analytics</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Continuous optimization</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="py-section bg-gray-50">
    <div class="container mx-auto px-4">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <div class="mb-8">
          <div class="relative inline-block">
            <div class="w-full max-w-md mx-auto bg-gray-100 rounded-lg p-8 flex items-center justify-center h-80">
              <div class="text-center text-gray-500">
                <svg class="w-24 h-24 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-sm">Expert Consulting Illustration</p>
              </div>
            </div>
            <!-- Decorative elements -->
            <div class="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full"></div>
            <div class="absolute -bottom-4 -left-4 w-12 h-12 bg-primary/30 rounded-full"></div>
          </div>
        </div>

        <h2 class="text-3xl md:text-4xl font-serif mb-6">Perfect For</h2>
        <p class="text-xl text-gray-700 max-w-3xl mx-auto">
          Thepia Flows transforms complex workplace processes into streamlined mobile experiences
        </p>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <!-- Employee Offboarding -->
        <div class="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-start mb-4">
            <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-medium mb-2">Employee Offboarding</h3>
              <p class="text-gray-600 mb-4">
                Equipment return and workspace handover with visual documentation
              </p>
            </div>
          </div>

          <ul class="space-y-2 text-sm text-gray-600">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Asset tracking with photos
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Digital handover process
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Compliance documentation
            </li>
          </ul>
        </div>

        <!-- Equipment Management -->
        <div class="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-start mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-medium mb-2">Equipment Management</h3>
              <p class="text-gray-600 mb-4">
                Track equipment lifecycle from deployment to maintenance and retirement
              </p>
            </div>
          </div>

          <ul class="space-y-2 text-sm text-gray-600">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              QR code scanning
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Maintenance scheduling
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Asset history tracking
            </li>
          </ul>
        </div>

        <!-- Employee Onboarding -->
        <div class="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-start mb-4">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-medium mb-2">Employee Onboarding</h3>
              <p class="text-gray-600 mb-4">
                Streamlined new hire processes with document collection and workspace setup
              </p>
            </div>
          </div>

          <ul class="space-y-2 text-sm text-gray-600">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Document collection
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Workspace setup
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Training coordination
            </li>
          </ul>
        </div>

        <!-- Custom Workflows -->
        <div class="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-start mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-medium mb-2">Custom Workflows</h3>
              <p class="text-gray-600 mb-4">
                Tailored solutions for your unique business processes and requirements
              </p>
            </div>
          </div>

          <ul class="space-y-2 text-sm text-gray-600">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Process analysis
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Custom development
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Ongoing optimization
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Authentication Section -->
  <section class="py-section bg-white">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Section Header -->
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-serif mb-6">Ready to Experience Thepia Flows?</h2>
          <p class="text-xl text-gray-700 max-w-2xl mx-auto">
            Sign in to explore our live demo and see how Thepia Flows can transform your workplace processes.
          </p>
        </div>

        <!-- Authentication Container -->
        <div class="bg-gray-50 rounded-2xl p-8 md:p-12">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <!-- Left Column - Benefits -->
            <div>
              <h3 class="text-2xl font-medium mb-6">What You'll Get</h3>

              <div class="space-y-6">
                <div class="flex items-start">
                  <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-lg font-medium mb-2">Interactive Demo Access</h4>
                    <p class="text-gray-600">
                      Explore fully functional workflow examples with real-time data and mobile-optimized interfaces.
                    </p>
                  </div>
                </div>

                <div class="flex items-start">
                  <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-lg font-medium mb-2">Passwordless Authentication</h4>
                    <p class="text-gray-600">
                      Experience our secure, privacy-first authentication system with WebAuthn passkeys and magic pins.
                    </p>
                  </div>
                </div>

                <div class="flex items-start">
                  <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-lg font-medium mb-2">Process Documentation</h4>
                    <p class="text-gray-600">
                      See how visual documentation and camera integration streamline complex workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>


            <div class="max-w-md mx-auto" data-astro-source-file="/Volumes/Projects/Thepia/flows.thepia.net/src/pages/index.astro" data-astro-source-loc="46:39"> 
              
                
                
                  <div class="auth-section s-SWtbu-qfivVU"><div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 s-SWtbu-qfivVU">
                    <div class="text-center mb-6 s-SWtbu-qfivVU">
                  <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 s-SWtbu-qfivVU">
                    <svg class="w-8 h-8 text-primary s-SWtbu-qfivVU" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" class="s-SWtbu-qfivVU"></path></svg></div> <h3 class="text-xl font-medium text-gray-900 mb-2 s-SWtbu-qfivVU">Employee Access Required</h3> 
                  <p class="text-gray-600 s-SWtbu-qfivVU">This demo is restricted to Thepia employees. Please sign in with your employee credentials.</p></div> <div class="mb-4 s-SWtbu-qfivVU"><label for="signin-email" class="block text-sm font-medium text-gray-700 mb-2 s-SWtbu-qfivVU">Email Address</label> <input id="signin-email" type="email" placeholder="Enter your email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent s-SWtbu-qfivVU"></div> <button class="w-full btn-primary flex items-center justify-center s-SWtbu-qfivVU" disabled=""><svg class="w-5 h-5 mr-2 s-SWtbu-qfivVU" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" class="s-SWtbu-qfivVU"></path></svg>
          Sign In with Passkey</button> <div class="mt-6 pt-6 border-t border-gray-200 s-SWtbu-qfivVU">
            <div class="text-sm text-gray-500 space-y-2 s-SWtbu-qfivVU"><div class="flex items-center s-SWtbu-qfivVU">
              <svg class="w-4 h-4 text-green-500 mr-2 s-SWtbu-qfivVU" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" class="s-SWtbu-qfivVU"></path>
                </svg> 
                <span class="s-SWtbu-qfivVU">Secure passkey authentication</span></div> 
                <div class="flex items-center s-SWtbu-qfivVU"><svg class="w-4 h-4 text-green-500 mr-2 s-SWtbu-qfivVU" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" class="s-SWtbu-qfivVU"></path></svg> 
                  <span class="s-SWtbu-qfivVU">Privacy-compliant access</span></div> 
                  <div class="flex items-center s-SWtbu-qfivVU">
                    <svg class="w-4 h-4 text-green-500 mr-2 s-SWtbu-qfivVU" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" class="s-SWtbu-qfivVU"></path></svg> 
                      <span class="s-SWtbu-qfivVU">Employee verification required</span></div></div></div></div></div><!--<AuthSection>-->
                        
                        </div>

          </div>
        </div>

      </div>


    </div>
  </section>


</main>
{/if}

            {#if SignInFormComponent && authStore}
              <svelte:component this={SignInFormComponent}
                store={authStore}
                initialEmail={emailInput}
                className="demo-signin-form"
                titleKey = 'flows.signIn.title'
                subtitleBrandedKey = 'flows.signIn.subtitle'
                subtitleKey = 'flows.signIn.subtitleGeneric'

                on:success={(e) => handleSignInSuccess(e.detail)}
                on:error={(e) => handleSignInError(e.detail)}
                on:stepChange={(e) => handleStepChange(e.detail)}
              />
            {:else}
              <div class="loading-auth">Loading authentication form...</div>
            {/if}

<!-- CSS Styles -->
<style>
  :global(.py-section) {
    padding-top: 5rem;
    padding-bottom: 5rem;
  }

  :global(.container) {
    max-width: 1200px;
  }

  :global(.font-serif) {
    font-family: 'EB Garamond', serif;
  }

  :global(.gradient-text) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  :global(.btn-primary) {
    background-color: #667eea;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
    border: none;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }

  :global(.btn-primary:hover) {
    background-color: rgba(102, 126, 234, 0.9);
  }

  :global(.btn-outline) {
    border: 2px solid #667eea;
    color: #667eea;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s ease;
    background-color: transparent;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }

  :global(.btn-outline:hover) {
    background-color: #667eea;
    color: white;
  }

  :global(.primary) {
    color: #667eea;
  }

  :global(.bg-primary) {
    background-color: #667eea;
  }

  :global(.border-primary) {
    border-color: #667eea;
  }

  :global(.text-primary) {
    color: #667eea;
  }

  :global(.bg-primary\/10) {
    background-color: rgba(102, 126, 234, 0.1);
  }

  :global(.bg-primary\/20) {
    background-color: rgba(102, 126, 234, 0.2);
  }

  :global(.bg-primary\/30) {
    background-color: rgba(102, 126, 234, 0.3);
  }

  :global(.bg-primary\/5) {
    background-color: rgba(102, 126, 234, 0.05);
  }

  :global(.from-primary\/10) {
    --tw-gradient-from: rgba(102, 126, 234, 0.1);
  }

  :global(.to-primary\/5) {
    --tw-gradient-to: rgba(102, 126, 234, 0.05);
  }

  :global(.hover\:bg-primary\/90:hover) {
    background-color: rgba(102, 126, 234, 0.9);
  }
</style>
